import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const corpus = JSON.parse(readFileSync("src/data/fa-corpus.json", "utf8"));
assert(corpus.signes.length <= corpus.capacite + 1);
const quote = (value) => "'" + JSON.stringify(value).replaceAll("'", "''") + "'::jsonb";
const text = (value) => "'" + value.replaceAll("'", "''") + "'";
const statements = corpus.signes.flatMap((sign, index) => [
  // Resolve references by slug. Existing IDs and all profile relations survive.
  `insert into public.fa_signs (slug, name) values (${text(sign.slug)}, ${text(sign.nom)}) on conflict (slug) do nothing;`,
  `insert into public.fa_sign_documents (fa_sign_id, catalog_slot, kind, mother_order, content, source, status)
select id, ${index + 1}, ${text(sign.type)}, ${sign.ordre ?? "null"}, ${quote(sign)}, ${quote(corpus.source)}, 'published'
from public.fa_signs where slug = ${text(sign.slug)}
on conflict (fa_sign_id) do update
set catalog_slot = excluded.catalog_slot,
    kind = excluded.kind,
    mother_order = excluded.mother_order,
    content = excluded.content,
    source = excluded.source,
    status = excluded.status,
    updated_at = now();`,
]);
const body = statements.join("\n\n");
writeFileSync(
  "supabase/fa-corpus-seed.sql",
  "-- Généré avec node scripts/export-fa-sql.mjs. Historique d'import : references/README.md.\n-- Rejouable sans écraser une fiche modifiée en base.\nbegin;\n" +
    body +
    "\ncommit;\n",
);
writeFileSync(
  "supabase/migrations/20260927143000_publish_complete_fa_library.sql",
  `begin;
alter table public.fa_sign_documents
  drop constraint if exists fa_sign_documents_catalog_slot_check;
alter table public.fa_sign_documents
  add constraint fa_sign_documents_catalog_slot_check
  check (catalog_slot between 1 and 257);

${body}

comment on table public.fa_sign_documents is
  'Bibliothèque éditoriale Ifawa : 256 signes et le messager Tchè-Tula.';
commit;
`,
);
console.log(`Import SQL préparé : ${corpus.signes.length} fiches publiées ou mises à jour.`);
