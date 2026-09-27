import type { User } from "@supabase/supabase-js";
import { actions, type Profil } from "./store";
import { clearPrivateCaches } from "./ifawa-cache";
import { supabase } from "./supabase";
import { photoToWebP } from "./image-webp";

type UserPath = "initiated" | "not_initiated";

export type OnboardingDraft = Partial<Profil> & {
  pseudo: string;
  initie: boolean;
  username?: string;
  avatarFile?: File | undefined;
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
    return parsed.draft;
  } catch {
    window.localStorage.removeItem(pendingDraftKey);
    return null;
  }
}

function metadataDraft(user: User): OnboardingDraft | null {
  const metadata = user.user_metadata ?? {};
  const username = typeof metadata["username"] === "string" ? metadata["username"] : "";
  if (!username) return null;
  return {
    pseudo:
      typeof metadata["display_name"] === "string"
        ? metadata["display_name"]
        : `@${username.replace(/^@/, "")}`,
    username,
    initie: metadata["path"] === "initiated",
    miseEnRelation: metadata["relation_enabled"] === true,
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
    .select("avatar_url, cover_url, username, relation_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username: existingProfile?.username ?? username,
      display_name: displayName,
      avatar_url: draft.avatarUrl ?? existingProfile?.avatar_url ?? null,
      cover_url: existingProfile?.cover_url ?? null,
      path,
      relation_enabled: draft.miseEnRelation ?? existingProfile?.relation_enabled ?? false,
      is_profile_complete: true,
    },
    { onConflict: "id" },
  );

  if (profileError) throw profileError;

  if (
    (draft.initie &&
      (draft.signe !== undefined || draft.annee !== undefined || draft.temoignage !== undefined)) ||
    Boolean(draft.temoignage?.trim())
  ) {
    const slug = signSlug(draft.signe);
    const { data: sign, error: signError } = slug
      ? await supabase.from("fa_signs").select("id").eq("slug", slug).maybeSingle()
      : { data: null, error: null };
    if (signError) throw signError;

    const { error: faError } = await supabase.from("profile_fa_details").upsert(
      {
        profile_id: user.id,
        fa_sign_id: sign?.id ?? null,
        custom_sign_name: !sign && draft.initie ? draft.signe?.trim() || null : null,
        initiation_year: draft.annee ? Number.parseInt(draft.annee, 10) || null : null,
        satisfaction_score: satisfactionScore(draft.satisfaction),
        experience_text: draft.temoignage ?? null,
        sign_visibility: draft.signVisibility ?? "private",
        initiation_year_visibility: "private",
        experience_visibility: "private",
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    // Signing in must never replay onboarding over an existing profile.
    if (!profile) {
      const draft = takePendingDraft(cleanEmail) ?? metadataDraft(data.user);
      if (draft) await createOrUpdateProfile(data.user, draft);
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(pendingDraftKey);
      } catch {
        /* Storage is optional. */
      }
    }
  }
  return data;
}

export async function loadCurrentProfile(knownUserId?: string): Promise<Partial<Profil> | null> {
  if (!supabase) return null;
  const userId = knownUserId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!userId) return null;
  const [{ data: profile, error: profileError }, { data: details }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, cover_url, path, relation_enabled")
      .eq("id", userId)
      .abortSignal(AbortSignal.timeout(15000))
      .maybeSingle(),
    supabase
      .from("profile_fa_details")
      .select(
        "initiation_year, satisfaction_score, experience_text, sign_visibility, custom_sign_name, fa_signs(name)",
      )
      .eq("profile_id", userId)
      .abortSignal(AbortSignal.timeout(15000))
      .maybeSingle(),
  ]);
  if (profileError) throw profileError;
  if (!profile) return null;

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
    avatarUrl: profile.avatar_url || "",
    coverUrl: profile.cover_url || "",
    initie: profile.path === "initiated",
    miseEnRelation: profile.relation_enabled,
    signe: sign?.name ?? details?.custom_sign_name ?? "",
    annee: details?.initiation_year ? String(details.initiation_year) : "",
    satisfaction: details?.satisfaction_score
      ? (satisfactionByScore[details.satisfaction_score] ?? "")
      : "",
    temoignage: details?.experience_text ?? "",
    signVisibility: details?.sign_visibility ?? "private",
  };
}

export async function updateProfileSettings(
  profile: Pick<Profil, "pseudo" | "miseEnRelation" | "avatarUrl">,
) {
  if (!supabase) throw new Error("La connexion n'est pas disponible.");
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) throw new Error("Reconnectez-vous pour enregistrer votre profil.");

  const { data: existingProfile, error: existingError } = await supabase
    .from("profiles")
    .select("id, username, path, cover_url, is_profile_complete")
    .eq("id", user.id)
    .maybeSingle();
  if (existingError) throw existingError;

  const desiredAvatar = profile.avatarUrl || null;
  const updates = {
    display_name: profile.pseudo.trim(),
    avatar_url: desiredAvatar,
    relation_enabled: profile.miseEnRelation,
  };

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("id, avatar_url")
    .maybeSingle();
  if (error) throw error;

  if (!updated) {
    const username =
      existingProfile?.username ?? normalizeUsername(profile.pseudo, user.email?.split("@")[0]);
    const { data: upserted, error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          username,
          path: existingProfile?.path ?? "not_initiated",
          cover_url: existingProfile?.cover_url ?? null,
          is_profile_complete: existingProfile?.is_profile_complete ?? true,
          ...updates,
        },
        { onConflict: "id" },
      )
      .select("id, avatar_url")
      .maybeSingle();
    if (upsertError) throw upsertError;
    if (!upserted) throw new Error("Le profil n'a pas pu être enregistré.");
    if (desiredAvatar && upserted.avatar_url !== desiredAvatar) {
      throw new Error("La photo de profil n'a pas pu être confirmée.");
    }
    return;
  }

  if (desiredAvatar && updated.avatar_url !== desiredAvatar) {
    throw new Error("La photo de profil n'a pas pu être confirmée.");
  }
}

export const updateProfileMedia = updateProfileSettings;

export async function uploadProfileAvatar(file: File) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Reconnectez-vous pour envoyer une photo.");

  const optimized = await photoToWebP(file, 1600);
  const path = `${userId}/avatar-${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(avatarBucket).upload(path, optimized, {
    contentType: "image/webp",
    cacheControl: "3600",
    upsert: true,
  });
  if (error) throw new Error("La photo de profil n'a pas pu être envoyée.");

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path);
  if (!data.publicUrl) throw new Error("La photo de profil n'a pas pu être préparée.");
  return data.publicUrl;
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
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  clearPrivateCaches();
  actions.setCurrentUserId(undefined);
}

export async function updateFaDetails(
  profile: Pick<
    Profil,
    "initie" | "signe" | "annee" | "satisfaction" | "temoignage" | "signVisibility"
  >,
) {
  if (!supabase) throw new Error("La connexion n'est pas disponible.");
  const user = await getCurrentUser();
  if (!user) throw new Error("Reconnectez-vous pour enregistrer votre parcours.");
  let signId: string | null = null;
  if (profile.signe) {
    const { data, error } = await supabase
      .from("fa_signs")
      .select("id")
      .eq("slug", signSlug(profile.signe))
      .maybeSingle();
    if (error) throw error;
    signId = data?.id ?? null;
  }
  const year = profile.annee ? Number(profile.annee) : null;
  if (year !== null && (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()))
    throw new Error("Indiquez une année valide.");
  const { error } = await supabase.from("profile_fa_details").upsert(
    {
      profile_id: user.id,
      fa_sign_id: profile.initie ? signId : null,
      custom_sign_name: profile.initie && !signId ? profile.signe.trim() || null : null,
      initiation_year: profile.initie ? year : null,
      satisfaction_score: profile.initie ? satisfactionScore(profile.satisfaction) : null,
      experience_text: profile.temoignage.trim() || null,
      sign_visibility: profile.signVisibility,
    },
    { onConflict: "profile_id" },
  );
  if (error) throw error;
  const { error: pathError } = await supabase
    .from("profiles")
    .update({ path: profile.initie ? "initiated" : "not_initiated" })
    .eq("id", user.id);
  if (pathError) throw pathError;
}

export async function requestPasswordReset(email: string) {
  if (!supabase) throw new Error("La connexion n'est pas disponible.");
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/connexion?recovery=1`,
  });
  if (error) throw error;
}

export async function changeRecoveredPassword(password: string) {
  if (!supabase) throw new Error("La connexion n'est pas disponible.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) return sessionData.session.user;
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
