import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";

const slugs = [
  "gbe-medji",
  "yekou-medji",
  "woli-medji",
  "di-medji",
  "losso-medji",
  "winlin-medji",
  "abla-medji",
  "aklan-medji",
  "guda-medji",
  "sa-medji",
  "ka-medji",
  "trukpin-medji",
  "tula-medji",
  "lete-medji",
  "tche-medji",
  "fu-medji",
  "tche-tula",
];
const lines = readFileSync("references/fa-corpus-source.txt", "utf8")
  .split(/\r?\n/)
  .map((x) => x.trim())
  .filter((x) => x && !x.startsWith("Ifawa — Base de données"));
const end = lines.indexOf("Annexe — Structure de données recommandée pour Ifawa");
assert(end > 0, "Source complète avec annexe attendue");
const body = lines.slice(0, end);
const headings = body
  .map((x, i) => (/^[A-ZÈÉÊÙÔÏ-]+-MÈDJI$/.test(x) || x === "TCHÈ-TULA — LE MESSAGER" ? i : -1))
  .filter((i) => i >= 0);
assert.equal(headings.length, 17);
const labels = ["Position", "Sexe", "Maison / statut", "Divinités", "Feuilles", "Couleurs"];
const fields = ["position", "sexeSymbolique", "maison", "divinites", "feuilles", "couleurs"];
const signs = headings.map((start, i) => {
  const section = body.slice(start, headings[i + 1] ?? body.length);
  const sign = {
    slug: slugs[i],
    nom: section[0]
      .split(" — ")[0]
      .toLocaleLowerCase("fr")
      .replace(/(^|-)(\p{L})/gu, (_, sep, c) => sep + c.toLocaleUpperCase("fr")),
    ordre: i < 16 ? i + 1 : null,
    type: i < 16 ? "signe_mere" : "messager",
  };
  let cursor = 1;
  labels.forEach((label, j) => {
    assert.equal(section[cursor++], label);
    sign[fields[j]] = section[cursor++];
  });
  assert.equal(section[cursor++], "Profil général");
  const devisesAt = section.indexOf("Grandes devises et sens associés");
  sign.profil = section.slice(cursor, devisesAt);
  cursor = devisesAt + 1;
  sign.devises = [];
  while (section[cursor] !== "Interdits") {
    const match = section[cursor++].match(/^(\d+)\. (.+)$/);
    assert(match, `Devise invalide ${sign.slug}`);
    sign.devises.push({ ordre: Number(match[1]), titre: match[2], sens: section[cursor++] });
  }
  cursor++;
  const prescriptionsAt = section.indexOf("Prescriptions et obligations");
  const syntheseAt = section.indexOf("Synthèse du signe");
  const bullet = (x) => {
    assert(x.startsWith(""));
    return x.replace(/^\s*/, "");
  };
  sign.interdits = section.slice(cursor, prescriptionsAt).map(bullet);
  sign.prescriptions = section.slice(prescriptionsAt + 1, syntheseAt).map(bullet);
  assert.equal(section.length, syntheseAt + 2);
  sign.synthese = section[syntheseAt + 1];
  assert(
    sign.profil.length >= 2 &&
      sign.devises.length >= 4 &&
      sign.interdits.length &&
      sign.prescriptions.length,
  );
  return sign;
});
const corpus = {
  source: {
    titre: "Ifawa — Base de données des 16 signes et Tchè-Tula",
    fichier: "Ifawa_Base_de_donnees_16_signes_et_Tche-Tula.docx",
    url: "https://chatgpt.com/share/6aa7e3be-fbc4-83ea-8eff-1e08688aa060",
    version: "2026-09-14",
  },
  capacite: 256,
  signes: signs,
};
writeFileSync("src/data/fa-corpus.json", JSON.stringify(corpus, null, 2) + "\n");
console.log(
  `Corpus : ${signs.length} fiches, ${signs.reduce((n, s) => n + s.devises.length, 0)} devises. Source conservée.`,
);
