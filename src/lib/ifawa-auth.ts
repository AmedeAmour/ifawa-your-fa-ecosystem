import type { User } from "@supabase/supabase-js";
import type { Profil } from "./store";
import { supabase } from "./supabase";

type UserPath = "initiated" | "not_initiated";

export type OnboardingDraft = Partial<Profil> & {
  pseudo: string;
  initie: boolean;
  username?: string;
  avatarFile?: File;
};

export type AuthResult =
  { status: "signed-in"; user: User } | { status: "confirmation-required"; user: User | null };

const pendingDraftKey = "ifawa.pending-onboarding";
const avatarBucket = "profile-media";

export function normalizeUsername(value: string, fallback = "membre") {
  const base = (value || fallback)
    .replace(/^@/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  const safe = base.length >= 3 ? base.slice(0, 24) : `${base || "ifa"}user`;
  return `${safe}_${Math.random().toString(36).slice(2, 7)}`.slice(0, 30);
}

function pathFromDraft(draft: OnboardingDraft): UserPath {
  return draft.initie ? "initiated" : "not_initiated";
}

function satisfactionScore(value?: string) {
  const scores: Record<string, number> = {
    "Très insatisfait": 1,
    Insatisfait: 2,
    Mitigé: 3,
    Satisfait: 4,
    "Très satisfait": 5,
  };
  return value ? (scores[value] ?? null) : null;
}

function signSlug(value?: string) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function storePendingDraft(email: string, draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(pendingDraftKey, JSON.stringify({ email, draft }));
}

function takePendingDraft(email: string): OnboardingDraft | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(pendingDraftKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { email?: string; draft?: OnboardingDraft };
    if (parsed.email?.toLowerCase() !== email.toLowerCase() || !parsed.draft) return null;
    window.localStorage.removeItem(pendingDraftKey);
    return parsed.draft;
  } catch {
    window.localStorage.removeItem(pendingDraftKey);
    return null;
  }
}

function metadataDraft(user: User): OnboardingDraft | null {
  const metadata = user.user_metadata ?? {};
  const username = typeof metadata.username === "string" ? metadata.username : "";
  if (!username) return null;
  return {
    pseudo: `@${username.replace(/^@/, "")}`,
    initie: metadata.path === "initiated",
    miseEnRelation: metadata.relation_enabled === true,
  };
}

async function draftWithStoredAvatar(user: User, draft: OnboardingDraft): Promise<OnboardingDraft> {
  if (!draft.avatarFile) return draft;
  const avatarUrl = await uploadProfileAvatar(draft.avatarFile);
  return { ...draft, avatarUrl, avatarFile: undefined };
}

export async function createOrUpdateProfile(user: User, draft: OnboardingDraft) {
  if (!supabase) throw new Error("La connexion à la plateforme n'est pas configurée.");

  const username =
    draft.username ?? normalizeUsername(draft.pseudo, user.email?.split("@")[0] ?? "membre");
  const displayName = draft.pseudo?.trim() || username;
  const path = pathFromDraft(draft);
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("avatar_url, relation_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      display_name: displayName,
      avatar_url: draft.avatarUrl ?? existingProfile?.avatar_url ?? null,
      cover_url: null,
      path,
      relation_enabled: draft.miseEnRelation ?? existingProfile?.relation_enabled ?? false,
      is_profile_complete: true,
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  if (draft.initie) {
    const slug = signSlug(draft.signe);
    const { data: sign } = await supabase
      .from("fa_signs")
      .select("id")
      .or(`slug.eq.${slug},name.eq.${draft.signe ?? ""}`)
      .maybeSingle();

    const { error: faError } = await supabase.from("profile_fa_details").upsert(
      {
        profile_id: user.id,
        fa_sign_id: sign?.id ?? null,
        initiation_year: draft.annee ? Number.parseInt(draft.annee, 10) || null : null,
        satisfaction_score: satisfactionScore(draft.satisfaction),
        experience_text: draft.temoignage ?? null,
        sign_visibility: "same_sign",
        initiation_year_visibility: "connections",
        experience_visibility: "connections",
      },
      { onConflict: "profile_id" },
    );

    if (faError) throw faError;
  }
}

export async function signUpWithOnboarding(
  email: string,
  password: string,
  draft: OnboardingDraft,
): Promise<AuthResult> {
  if (!supabase) throw new Error("La connexion à la plateforme n'est pas configurée.");

  const cleanEmail = email.trim().toLowerCase();
  const username = normalizeUsername(draft.pseudo, cleanEmail.split("@")[0]);
  const accountDraft = { ...draft, username };
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        username,
        display_name: draft.pseudo?.trim() || username,
        path: pathFromDraft(draft),
        relation_enabled: draft.miseEnRelation ?? false,
      },
    },
  });

  if (error) throw error;

  if (data.session && data.user) {
    await createOrUpdateProfile(data.user, await draftWithStoredAvatar(data.user, accountDraft));
    return { status: "signed-in", user: data.user };
  }

  const signedIn = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (!signedIn.error && signedIn.data.user) {
    await createOrUpdateProfile(
      signedIn.data.user,
      await draftWithStoredAvatar(signedIn.data.user, accountDraft),
    );
    return { status: "signed-in", user: signedIn.data.user };
  }

  storePendingDraft(cleanEmail, { ...accountDraft, avatarFile: undefined });
  return { status: "confirmation-required", user: data.user };
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("La connexion à la plateforme n'est pas configurée.");

  const cleanEmail = email.trim().toLowerCase();
  const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
  if (error) throw error;
  if (data.user) {
    const draft = takePendingDraft(cleanEmail) ?? metadataDraft(data.user);
    if (draft) await createOrUpdateProfile(data.user, draft);
  }
  return data;
}

export async function loadCurrentProfile(): Promise<Partial<Profil> | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, cover_url, path, relation_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: details } = await supabase
    .from("profile_fa_details")
    .select("initiation_year, satisfaction_score, experience_text, fa_signs(name)")
    .eq("profile_id", user.id)
    .maybeSingle();

  const satisfactionByScore: Record<number, string> = {
    1: "Très insatisfait",
    2: "Insatisfait",
    3: "Mitigé",
    4: "Satisfait",
    5: "Très satisfait",
  };

  const sign = Array.isArray(details?.fa_signs) ? details?.fa_signs[0] : details?.fa_signs;

  return {
    pseudo: profile.display_name || `@${profile.username}`,
    avatarUrl: profile.avatar_url || undefined,
    initie: profile.path === "initiated",
    miseEnRelation: profile.relation_enabled,
    signe: sign?.name ?? undefined,
    annee: details?.initiation_year ? String(details.initiation_year) : undefined,
    satisfaction: details?.satisfaction_score
      ? satisfactionByScore[details.satisfaction_score]
      : undefined,
    temoignage: details?.experience_text ?? undefined,
  };
}

export async function updateProfileSettings(
  profile: Pick<Profil, "pseudo" | "miseEnRelation" | "avatarUrl">,
) {
  if (!supabase) return;
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: profile.pseudo.trim(),
      avatar_url: profile.avatarUrl ?? null,
      relation_enabled: profile.miseEnRelation,
    })
    .eq("id", userData.user.id);
  if (error) throw error;
}

export const updateProfileMedia = updateProfileSettings;

export async function uploadProfileAvatar(file: File) {
  if (!supabase) return readFileAsDataUrl(file);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return readFileAsDataUrl(file);

  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error } = await supabase.storage.from(avatarBucket).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) return readFileAsDataUrl(file);

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);
  return data.publicUrl || readFileAsDataUrl(file);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function onAuthUserChange(callback: (user: User | null) => void) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
