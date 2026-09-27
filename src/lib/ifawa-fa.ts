import { z } from "zod";
import { signDocuments, type SignDocument } from "@/data/fa-signs";
import { supabase } from "./supabase";

const text = z.string().min(1);
const documentSchema = z.object({
  slug: text,
  nom: text,
  ordre: z.number().int().min(1).max(16).nullable(),
  type: z.enum(["signe_mere", "signe_derive", "messager"]),
  position: text,
  sexeSymbolique: text,
  maison: text,
  divinites: text,
  feuilles: text,
  couleurs: text,
  profil: z.array(text).min(1),
  devises: z.array(z.object({ ordre: z.number().int().positive(), titre: text, sens: text })),
  interdits: z.array(text),
  prescriptions: z.array(text),
  synthese: text,
});

// Corpus imported into Ifawa2. The flag can explicitly select the bundled copy.
export async function loadSignDocuments(): Promise<SignDocument[]> {
  if (import.meta.env["VITE_FA_CORPUS_REMOTE"] === "false" || !supabase) return signDocuments;
  const { data, error } = await supabase
    .from("fa_sign_documents")
    .select("content")
    .eq("status", "published")
    .order("catalog_slot")
    .limit(257);
  if (error) throw error;
  return (data ?? []).map((row) => documentSchema.parse(row.content));
}
