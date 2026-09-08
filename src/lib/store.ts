import { useSyncExternalStore } from "react";
import { type Post, type Notification } from "@/data/mock";

export type ReactionKind = "like" | "love" | "laugh" | "support";

export type Profil = {
  pseudo: string;
  avatarUrl?: string;
  coverUrl?: string;
  initie: boolean;
  signe: string;
  annee: string;
  satisfaction: string;
  temoignage: string;
  miseEnRelation: boolean;
  interets: string[];
};

export type AppState = {
  onboarded: boolean;
  currentUserId?: string;
  profil: Profil;
  posts: Post[];
  reactions: Record<string, ReactionKind>;
  notifications: Notification[];
  connexions: string[];
  demandes: { id: string; etat: "attente" | "acceptee" | "refusee" }[];
  demandesEnvoyees: string[];
};

const initial: AppState = {
  onboarded: false,
  profil: {
    pseudo: "@Vous",
    initie: true,
    signe: "Gbé Mêdji",
    annee: "2018",
    satisfaction: "Satisfait",
    temoignage:
      "Depuis mon initiation, j'avance avec plus de clarté. J'aime échanger avec les membres du même signe.",
    miseEnRelation: true,
    interets: [],
  },
  posts: [],
  reactions: {},
  notifications: [],
  connexions: [],
  demandes: [],
  demandesEnvoyees: [],
};

const storageKey = "ifawa.app-state";

function readInitialState() {
  if (typeof window === "undefined") return initial;
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return initial;
  try {
    const persisted = JSON.parse(raw) as Partial<AppState>;
    return {
      ...initial,
      ...persisted,
      posts: initial.posts,
      reactions: initial.reactions,
      notifications: initial.notifications,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return initial;
  }
}

function persist(next: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(next));
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
    state = readInitialState();
    emit();
  },
  setCurrentUserId(userId?: string) {
    setState({ currentUserId: userId });
  },
  remplacerPosts(posts: Post[], reactions?: Record<string, ReactionKind>) {
    setState((s) => ({
      posts,
      reactions: reactions ?? s.reactions,
    }));
  },
  remplacerNotifications(notifications: Notification[]) {
    setState((s) => {
      const readIds = new Set(
        s.notifications
          .filter((notification) => !notification.nonLue)
          .map((notification) => notification.id),
      );
      return {
        notifications: notifications.map((notification) => ({
          ...notification,
          nonLue: notification.nonLue && !readIds.has(notification.id),
        })),
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
    setState((s) => ({ profil: { ...s.profil, ...patch }, onboarded: true }));
  },
  lireNotification(id: string) {
    setState((s) => ({
      notifications: s.notifications.map((notification) =>
        notification.id === id ? { ...notification, nonLue: false } : notification,
      ),
    }));
  },
  toutLireNotifications() {
    setState((s) => ({
      notifications: s.notifications.map((notification) => ({ ...notification, nonLue: false })),
    }));
  },
};
