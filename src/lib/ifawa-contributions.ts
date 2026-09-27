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
  reviewerNote: string;
  createdAt: string;
  updatedAt: string;
};

export type ApprovedContribution = {
  id: string;
  category: string;
  categoryLabel: string;
  body: string;
  authorName: string;
  publishedAt: string;
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

  const { data: sign, error: signError } = await supabase
    .from("fa_signs")
    .select("id")
    .eq("name", title)
    .maybeSingle();
  if (signError) throw signError;
  if (!sign) throw new Error("Ce signe n’est pas encore disponible dans le référentiel.");
  const { data, error } = await supabase
    .from("contributions")
    .insert({
      fa_sign_id: sign.id,
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
    .select("id,title,category,body,status,reviewer_note,created_at,updated_at")
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const contributions = data.map((item) => ({
    id: item.id,
    title: item.title,
    category: item.category,
    categoryLabel: categoryLabels[item.category] ?? item.category,
    body: item.body,
    status: item.status,
    reviewerNote: item.reviewer_note ?? "",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  }));
  writeCache(user.id, "contributions", contributions);
  return contributions;
}

export async function resubmitContribution(id: string, body: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const cleanBody = body.trim();
  if (!cleanBody) throw new Error("La contribution ne peut pas être vide.");
  const { data, error } = await supabase
    .from("contributions")
    .update({ body: cleanBody, status: "submitted", reviewer_note: null })
    .eq("id", id)
    .eq("status", "needs_review")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cette contribution ne peut plus être modifiée.");
}

export async function loadApprovedContributions(signSlug: string): Promise<ApprovedContribution[]> {
  if (!supabase) return [];
  const { data: sign, error: signError } = await supabase
    .from("fa_signs")
    .select("id")
    .eq("slug", signSlug)
    .maybeSingle();
  if (signError) throw signError;
  if (!sign) return [];
  const { data, error } = await supabase
    .from("contributions")
    .select(
      "id,category,body,published_at,profiles!contributions_author_id_fkey(username,display_name)",
    )
    .eq("fa_sign_id", sign.id)
    .eq("status", "approved")
    .order("published_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => {
    const author = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    return {
      id: item.id,
      category: item.category,
      categoryLabel: categoryLabels[item.category] ?? item.category,
      body: item.body,
      authorName: author?.display_name || `@${author?.username || "membre"}`,
      publishedAt: item.published_at ?? "",
    };
  });
}

export function readCachedContributions(userId?: string): ContributionItem[] {
  return readCache<ContributionItem[]>(userId, "contributions", []);
}
