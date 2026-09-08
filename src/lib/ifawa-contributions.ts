import { readCache, writeCache } from "./ifawa-cache";
import { supabase } from "./supabase";

const categoryLabels: Record<string, string> = {
  teaching: "Enseignement",
  variant: "Variante",
  taboo: "Interdit",
  recommendation: "Recommandation",
  testimony: "Témoignage",
  other: "Autre",
};

export type ContributionItem = {
  id: string;
  title: string;
  category: string;
  categoryLabel: string;
  body: string;
  status: string;
  createdAt: string;
};

export function normalizeContributionCategory(value: string) {
  const text = value.toLowerCase();
  if (text.includes("variante")) return "variant";
  if (text.includes("interdit")) return "taboo";
  if (text.includes("recommand")) return "recommendation";
  if (text.includes("témoign") || text.includes("temoign")) return "testimony";
  if (text.includes("ense")) return "teaching";
  return "other";
}

export async function createContribution({
  title,
  category,
  body,
}: {
  title: string;
  category: string;
  body: string;
}) {
  if (!supabase) throw new Error("La connexion à la plateforme n'est pas configurée.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Connectez-vous pour proposer une contribution.");

  const { data, error } = await supabase
    .from("contributions")
    .insert({
      author_id: user.id,
      title,
      category: normalizeContributionCategory(category),
      body,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id as string;
}

export async function loadMyContributions(): Promise<ContributionItem[]> {
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("contributions")
    .select("id,title,category,body,status,created_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  const contributions = data.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    categoryLabel: categoryLabels[item.category] ?? item.category,
    body: item.body,
    status: item.status,
    createdAt: item.created_at,
  }));
  writeCache(user.id, "contributions", contributions);
  return contributions;
}

export function readCachedContributions(userId?: string): ContributionItem[] {
  return readCache<ContributionItem[]>(userId, "contributions", []);
}
