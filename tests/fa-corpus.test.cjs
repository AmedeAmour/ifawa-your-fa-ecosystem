const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const corpus = JSON.parse(fs.readFileSync("src/data/fa-corpus.json", "utf8"));
const catalog = JSON.parse(fs.readFileSync("src/data/fa-sign-names.json", "utf8"));

test("le corpus conserve intégralement les 17 fiches du document", () => {
  const source = fs
    .readFileSync("references/fa-corpus-source.txt", "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("Ifawa — Base de données"));
  const original = source.slice(
    0,
    source.indexOf("Annexe — Structure de données recommandée pour Ifawa"),
  );
  const rebuilt = corpus.signes
    .slice(0, 17)
    .flatMap((s) => [
      s.nom.toLocaleUpperCase("fr") + (s.type === "messager" ? " — LE MESSAGER" : ""),
      "Position",
      s.position,
      "Sexe",
      s.sexeSymbolique,
      "Maison / statut",
      s.maison,
      "Divinités",
      s.divinites,
      "Feuilles",
      s.feuilles,
      "Couleurs",
      s.couleurs,
      "Profil général",
      ...s.profil,
      "Grandes devises et sens associés",
      ...s.devises.flatMap((d) => [`${d.ordre}. ${d.titre}`, d.sens]),
      "Interdits",
      ...s.interdits.map((x) => "  " + x),
      "Prescriptions et obligations",
      ...s.prescriptions.map((x) => "  " + x),
      "Synthèse du signe",
      s.synthese,
    ]);
  assert.deepEqual(rebuilt, original);
});

test("16 signes-mères, un messager et 240 fiches dérivées ont des identifiants uniques", () => {
  assert.equal(corpus.capacite, 256);
  assert.equal(corpus.signes.length, 257);
  assert.equal(new Set(corpus.signes.map((s) => s.slug)).size, 257);
  assert.deepEqual(
    corpus.signes.filter((s) => s.type === "signe_mere").map((s) => s.ordre),
    Array.from({ length: 16 }, (_, i) => i + 1),
  );
  assert.equal(corpus.signes.find((s) => s.slug === "tche-tula").ordre, null);
  const pilot = corpus.signes.find((s) => s.slug === "signe-017-gbe-yeku");
  assert.equal(pilot.type, "signe_derive");
  assert.equal(pilot.interdits.length, 3);
  assert.deepEqual(Object.keys(pilot), [
    "slug",
    "nom",
    "ordre",
    "type",
    "position",
    "sexeSymbolique",
    "maison",
    "divinites",
    "feuilles",
    "couleurs",
    "profil",
    "devises",
    "interdits",
    "prescriptions",
    "synthese",
  ]);
  const second = corpus.signes.find((s) => s.slug === "signe-018-gbe-woli");
  assert.equal(second.type, "signe_derive");
  assert.equal(second.devises.length, 4);
  assert.equal(second.interdits.length, 2);
  assert.equal(corpus.signes.filter((s) => s.type === "signe_derive").length, 240);
  assert.equal(corpus.signes.at(-1).slug, "signe-256-fu-ka");
});

test("chaque fiche dérivée respecte le format éditorial complet", () => {
  const expectedKeys = [
    "slug",
    "nom",
    "ordre",
    "type",
    "position",
    "sexeSymbolique",
    "maison",
    "divinites",
    "feuilles",
    "couleurs",
    "profil",
    "devises",
    "interdits",
    "prescriptions",
    "synthese",
  ];
  for (const sign of corpus.signes.filter((s) => s.type === "signe_derive")) {
    assert.deepEqual(Object.keys(sign), expectedKeys, sign.slug);
    assert.equal(sign.profil.length, 4, sign.slug);
    assert(sign.devises.length >= 1 && sign.devises.length <= 5, sign.slug);
    assert(sign.interdits.length >= 1, sign.slug);
    assert(sign.prescriptions.length >= 1, sign.slug);
    assert(sign.synthese.length >= 120, sign.slug);
    assert(
      sign.devises.every((d, i) => d.ordre === i + 1 && d.titre.length <= 120),
      sign.slug,
    );
  }
});

test("aucune mention des documents de travail n'est affichable dans les fiches", () => {
  const publicCopy = JSON.stringify(corpus.signes);
  assert.doesNotMatch(
    publicCopy,
    /document de référence|source béninoise|corpus traditionnel|\.pdf/i,
  );
});

test("le catalogue contient les 256 noms, dont 240 autres signes", () => {
  assert.equal(catalog.capacite, 256);
  assert.equal(catalog.signes.length, 256);
  assert.equal(new Set(catalog.signes.map((s) => s.slug)).size, 256);
  assert.equal(new Set(catalog.signes.map((s) => s.nom)).size, 256);
  assert.equal(catalog.signes.filter((s) => s.type === "signe_mere").length, 16);
  assert.equal(catalog.signes.filter((s) => s.type === "autre").length, 240);
  assert.deepEqual(
    catalog.signes.filter((s) => s.source === "matrice-completee").map((s) => s.nom),
    [
      "WINLIN TULA",
      "WINLIN KA",
      "SA ABLA",
      "LETE YEKOU",
      "FU SA",
      "FU TRUKPIN",
      "FU TULA",
      "FU LETE",
      "FU TCHE",
      "FU KA",
    ],
  );
});

test("recherche dès une lettre, sans accents ni séparateurs obligatoires", () => {
  const exports = {};
  const { outputText } = ts.transpileModule(fs.readFileSync("src/lib/search-text.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  vm.runInNewContext(outputText, { exports });
  const { matchesSearch } = exports;
  const gResults = corpus.signes.filter((s) => matchesSearch(s.nom, "g")).map((s) => s.slug);
  assert.deepEqual(gResults.slice(0, 4), [
    "gbe-medji",
    "guda-medji",
    "signe-017-gbe-yeku",
    "signe-018-gbe-woli",
  ]);
  assert(gResults.includes("signe-250-fu-guda"));
  assert(matchesSearch("Yèkou-Mèdji", "yekou"));
  assert(matchesSearch("Gbé-Mèdji", "gbemedji"));
  assert(!matchesSearch("Gbé-Mèdji", ""));
  assert(!matchesSearch("Gbé-Mèdji", "%"));
  assert(matchesSearch("Signe 12", "12"));
});
