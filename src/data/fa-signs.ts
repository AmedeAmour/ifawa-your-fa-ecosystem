import corpus from "./fa-corpus.json";
import signCatalog from "./fa-sign-names.json";

export type SignDocument = {
  slug: string;
  nom: string;
  ordre: number | null;
  type: "signe_mere" | "signe_derive" | "messager";
  position: string;
  sexeSymbolique: string;
  maison: string;
  divinites: string;
  feuilles: string;
  couleurs: string;
  profil: string[];
  devises: Array<{ ordre: number; titre: string; sens: string }>;
  interdits: string[];
  prescriptions: string[];
  synthese: string;
};
export type SignCatalogItem = {
  slug: string;
  nom: string;
  numero: number;
  type: "signe_mere" | "autre";
  documentSlug?: string;
  source: "corpus-detaille" | "pdf" | "matrice-completee";
};
export const faCapacity = corpus.capacite;
export const signDocuments = corpus.signes as SignDocument[];
export const faSignCatalog = signCatalog.signes as SignCatalogItem[];
export const signes = faSignCatalog.map((sign) => ({
  ...sign,
  numero: String(sign.numero).padStart(3, "0"),
}));
