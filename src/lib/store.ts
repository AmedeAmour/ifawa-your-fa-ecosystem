import { useSyncExternalStore } from "react";
import { type Post, type Notification } from "@/data/mock";
import { persistReceipt } from "./read-receipts";

export type ReactionKind = "like" | "love" | "laugh" | "support";

export type Profil = {
  pseudo: string;
  avatarUrl?: string | undefined;
  coverUrl?: string | undefined;
  signVisibility: "private" | "same_sign" | "connections";
  initie: boolean;
  signe: string;
  annee: string;
  satisfaction: string;
  temoignage: string;
  miseEnRelation: boolean;
  interets: string[];
};

export type AppState = {
  profileReady: boolean;
  onboarded: boolean;
  currentUserId?: string | undefined;
  profil: Profil;
  posts: Post[];
  reactions: Record<string, ReactionKind>;
  notifications: Notification[];
  readNotificationIds: string[];
  connexions: string[];
  demandes: { id: string; etat: "attente" | "acceptee" | "refusee" }[];
  demandesEnvoyees: string[];
  savedPostIds: string[];
  hiddenPostIds: string[];
};

const initial: AppState = {
  profileReady: false,
  onboarded: false,
  profil: {
    pseudo: "@Vous",
    initie: false,
    signe: "",
    annee: "",
    satisfaction: "",
    temoignage: "",
    signVisibility: "private",
    miseEnRelation: false,
    interets: [],
  },
  posts: [],
  reactions: {},
  notifications: [],
  readNotificationIds: [],
  connexions: [],
  demandes: [],
  demandesEnvoyees: [],
  savedPostIds: [],
  hiddenPostIds: [],
};

const storageKey = "ifawa.app-state";

function readInitialState(userId?: string) {
  if (typeof window === "undefined") return initial;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return initial;
    const persisted = JSON.parse(raw) as Partial<AppState>;
    if (!userId || persisted.currentUserId !== userId) return initial;
    return {
      ...initial,
      ...persisted,
      posts: initial.posts,
      reactions: initial.reactions,
      notifications: initial.notifications,
      readNotificationIds: persisted.readNotificationIds ?? initial.readNotificationIds,
    };
  } catch {
    // Storage can be unavailable in private browsing.
    return initial;
  }
}

function persist(next: AppState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    /* Remote writes must not depend on local storage capacity. */
  }
}

let state: AppState = initial;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  persist(state);
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => state;

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const actions = {
  hydratePersistedState() {
    // Restore only after the authenticated account is known.
  },
  setCurrentUserId(userId?: string) {
    if (state.currentUserId !== userId || !userId) {
      setState({
        ...readInitialState(userId),
        profil: { ...initial.profil },
        profileReady: false,
        currentUserId: userId,
      });
    }
  },
  isCurrentUser(userId?: string) {
    return state.currentUserId === userId;
  },
  toggleSavedPost(id: string) {
    setState((s) => ({
      savedPostIds: s.savedPostIds.includes(id)
        ? s.savedPostIds.filter((value) => value !== id)
        : [...s.savedPostIds, id],
    }));
  },
  hidePost(id: string) {
    setState((s) => ({ hiddenPostIds: [...new Set([...s.hiddenPostIds, id])] }));
  },
  restoreHiddenPosts() {
    setState({ hiddenPostIds: [] });
  },
  remplacerPosts(posts: Post[], reactions?: Record<string, ReactionKind>) {
    setState((s) => ({
      posts,
      reactions: reactions ?? s.reactions,
    }));
  },
  remplacerNotifications(notifications: Notification[]) {
    setState((s) => {
      const readIds = new Set([
        ...s.readNotificationIds,
        ...s.notifications
          .filter((notification) => !notification.nonLue)
          .map((notification) => notification.id),
      ]);
      return {
        notifications: notifications.map((notification) => ({
          ...notification,
          nonLue: notification.nonLue && !readIds.has(notification.id),
        })),
        readNotificationIds: [...readIds],
      };
    });
  },
  publier(contenu: string, mediaUrl = "", type: Post["type"] = "Membre") {
    if (!contenu.trim()) return;
    setState((s) => ({
      posts: [
        {
          id: `p-${Date.now()}`,
          auteur: s.profil.pseudo,
          authorAvatarUrl: s.profil.avatarUrl,
          signe: s.profil.initie ? s.profil.signe : undefined,
          type,
          heure: "à l'instant",
          contenu,
          image: Boolean(mediaUrl),
          mediaUrl,
          reactions: 0,
          commentaires: [],
          canEdit: true,
        },
        ...s.posts,
      ],
    }));
  },
  reagir(id: string, reaction: ReactionKind) {
    setState((s) => {
      const active = s.reactions[id];
      const nextReactions = { ...s.reactions };
      const delta = active ? (active === reaction ? -1 : 0) : 1;
      if (active === reaction) {
        delete nextReactions[id];
      } else {
        nextReactions[id] = reaction;
      }
      return {
        reactions: nextReactions,
        posts: s.posts.map((p) =>
          p.id === id ? { ...p, reactions: Math.max(0, p.reactions + delta) } : p,
        ),
      };
    });
  },
  commenter(id: string, texte: string) {
    if (!texte.trim()) return;
    setState((s) => ({
      posts: s.posts.map((p) =>
        p.id === id
          ? {
              ...p,
              commentaires: [
                ...p.commentaires,
                {
                  id: `c-${Date.now()}`,
                  authorId: s.currentUserId,
                  auteur: s.profil.pseudo,
                  authorAvatarUrl: s.profil.avatarUrl,
                  texte,
                  heure: "à l'instant",
                  canDelete: true,
                },
              ],
            }
          : p,
      ),
    }));
  },
  supprimerCommentaire(postId: string, commentaireId: string) {
    setState((s) => ({
      posts: s.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              commentaires: p.commentaires.filter(
                (c) => c.id !== commentaireId || c.auteur !== s.profil.pseudo,
              ),
            }
          : p,
      ),
    }));
  },
  partager(id: string, note = "") {
    setState((s) => {
      const post = s.posts.find((p) => p.id === id);
      if (!post) return {};
      const contenu = note.trim()
        ? `${note.trim()}\n\nPublication partagée de ${post.auteur} : ${post.contenu}`
        : `Publication partagée de ${post.auteur} : ${post.contenu}`;
      return {
        posts: [
          {
            id: `share-${Date.now()}`,
            auteur: s.profil.pseudo,
            authorAvatarUrl: s.profil.avatarUrl,
            signe: s.profil.initie ? s.profil.signe : undefined,
            type: "Membre",
            heure: "à l'instant",
            contenu,
            image: post.image,
            mediaUrl: post.mediaUrl,
            reactions: 0,
            commentaires: [],
            canEdit: true,
          },
          ...s.posts,
        ],
      };
    });
  },
  supprimerPublication(id: string) {
    setState((s) => ({
      posts: s.posts.filter((p) => p.id !== id || !p.canEdit),
    }));
  },
  modifierPublication(id: string, contenu: string) {
    if (!contenu.trim()) return;
    setState((s) => ({
      posts: s.posts.map((p) => (p.id === id && p.canEdit ? { ...p, contenu } : p)),
    }));
  },
  repondreDemande(id: string, etat: "acceptee" | "refusee") {
    setState((s) => ({
      demandes: s.demandes.map((d) => (d.id === id ? { ...d, etat } : d)),
      connexions: etat === "acceptee" ? [...s.connexions, id] : s.connexions,
    }));
  },
  envoyerDemande(id: string) {
    setState((s) =>
      s.demandesEnvoyees.includes(id) ? {} : { demandesEnvoyees: [...s.demandesEnvoyees, id] },
    );
  },
  majProfil(patch: Partial<Profil>) {
    const cleanPatch = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined),
    ) as Partial<Profil>;
    setState((s) => ({
      profil: { ...s.profil, ...cleanPatch },
      onboarded: true,
      profileReady: true,
    }));
  },
  lireNotification(id: string) {
    if (state.currentUserId)
      void persistReceipt(state.currentUserId, "notification", id).catch(() => {});
    setState((s) => ({
      readNotificationIds: s.readNotificationIds.includes(id)
        ? s.readNotificationIds
        : [...s.readNotificationIds, id],
      notifications: s.notifications.map((notification) =>
        notification.id === id ? { ...notification, nonLue: false } : notification,
      ),
    }));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ifawa:refresh-badges"));
    }
  },
  toutLireNotifications() {
    if (state.currentUserId)
      for (const item of state.notifications.filter((item) => item.type !== "message"))
        void persistReceipt(state.currentUserId, "notification", item.id).catch(() => {});
    setState((s) => ({
      readNotificationIds: [
        ...new Set([...s.readNotificationIds, ...s.notifications.map((item) => item.id)]),
      ],
      notifications: s.notifications.map((notification) => ({ ...notification, nonLue: false })),
    }));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("ifawa:refresh-badges"));
    }
  },
  lireNotificationsConversation(conversationId: string) {
    setState((s) => {
      const ids = s.notifications
        .filter(
          (notification) =>
            notification.type === "message" && notification.conversationId === conversationId,
        )
        .map((notification) => notification.id);
      return {
        readNotificationIds: [...new Set([...s.readNotificationIds, ...ids])],
        notifications: s.notifications.map((notification) =>
          notification.type === "message" && notification.conversationId === conversationId
            ? { ...notification, nonLue: false }
            : notification,
        ),
      };
    });
  },
};
