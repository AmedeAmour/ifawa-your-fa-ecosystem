import { supabase } from "./supabase";

export type AdminRole = "admin" | "moderator";
export type ContributionStatus =
  "submitted" | "under_review" | "needs_review" | "approved" | "rejected" | "archived";

export type AdminContribution = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: ContributionStatus;
  reviewerNote: string;
  createdAt: string;
  reviewedAt?: string | undefined;
  publishedAt?: string | undefined;
  authorId: string;
  authorName: string;
  authorUsername: string;
  signName: string;
};

export type ModerationEvent = {
  id: string;
  action: string;
  fromStatus?: string | undefined;
  toStatus: string;
  note?: string | undefined;
  createdAt: string;
};

export async function loadAdminAccess(): Promise<AdminRole | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("admin_members")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as AdminRole | undefined) ?? null;
}

export async function loadAdminContributions(): Promise<AdminContribution[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("contributions")
    .select(
      "id,title,body,category,status,reviewer_note,created_at,reviewed_at,published_at,author_id,profiles!contributions_author_id_fkey(username,display_name),fa_signs(name)",
    )
    .order("created_at", { ascending: false })
    .limit(250);
  if (error) throw error;
  return (data ?? []).map((item) => {
    const author = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
    const sign = Array.isArray(item.fa_signs) ? item.fa_signs[0] : item.fa_signs;
    return {
      id: item.id,
      title: item.title,
      body: item.body,
      category: item.category,
      status: item.status as ContributionStatus,
      reviewerNote: item.reviewer_note ?? "",
      createdAt: item.created_at,
      reviewedAt: item.reviewed_at ?? undefined,
      publishedAt: item.published_at ?? undefined,
      authorId: item.author_id,
      authorName: author?.display_name || `@${author?.username || "membre"}`,
      authorUsername: author?.username ?? "",
      signName: sign?.name ?? item.title,
    };
  });
}

export async function loadModerationEvents(contributionId: string): Promise<ModerationEvent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("contribution_moderation_events")
    .select("id,action,from_status,to_status,note,created_at")
    .eq("contribution_id", contributionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((event) => ({
    id: event.id,
    action: event.action,
    fromStatus: event.from_status ?? undefined,
    toStatus: event.to_status,
    note: event.note ?? undefined,
    createdAt: event.created_at,
  }));
}

export async function moderateContribution(
  contributionId: string,
  decision: "under_review" | "needs_review" | "approved" | "rejected" | "archived",
  note: string,
) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const cleanNote = note.trim();
  if ((decision === "needs_review" || decision === "rejected") && !cleanNote) {
    throw new Error("Ajoutez une explication avant d’envoyer cette décision.");
  }
  const { data, error } = await supabase
    .from("contributions")
    .update({ status: decision, reviewer_note: cleanNote || null })
    .eq("id", contributionId)
    .select("id,status")
    .single();
  if (error) throw error;
  return data;
}
