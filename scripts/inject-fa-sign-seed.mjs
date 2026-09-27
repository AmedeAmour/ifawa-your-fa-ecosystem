import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = path.join(
  root,
  "supabase/migrations/20260926174654_contribution_moderation_workflow.sql",
);
const catalog = JSON.parse(fs.readFileSync(path.join(root, "src/data/fa-sign-names.json"), "utf8"));
const marker = "-- FA_SIGN_CATALOG_SEED";
const source = fs.readFileSync(migration, "utf8");
const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const values = catalog.signes
  .map((sign) => `  (${quote(sign.slug)}, ${quote(sign.nom)}, ${Number(sign.numero)})`)
  .join(",\n");
const seed = `${marker}\ninsert into public.fa_signs (slug, name, display_order)\nvalues\n${values}\non conflict (slug) do update\nset name = excluded.name, display_order = excluded.display_order, updated_at = now();`;
const next = source.replace(new RegExp(`${marker}[\\s\\S]*?\\n\\ncommit;`), `${seed}\n\ncommit;`);
if (next === source) throw new Error("Migration seed marker not found");
fs.writeFileSync(migration, next);
console.log(`Injected ${catalog.signes.length} Fa sign names into the moderation migration.`);
