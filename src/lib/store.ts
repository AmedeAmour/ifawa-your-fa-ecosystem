import { useSyncExternalStore } from "react";
import { posts as seedPosts, type Post, demandesConnexion } from "@/data/mock";

export type Profil = {
  pseudo: string;
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
  profil: Profil;
  posts: Post[];
  reactions: Record<string, boolean>;
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
  posts: seedPosts,
  reactions: {},
  connexions: ["segbo23", "ayaba", "todan"],
  demandes: demandesConnexion.map((d) => ({ id: d.id, etat: "attente" as const })),
  demandesEnvoyees: [],
};

let state: AppState = initial;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
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
  publier(contenu: string, avecImage = false) {
    if (!contenu.trim()) return;
    setState((s) => ({
      posts: [
        {
          id: `p-${Date.now()}`,
          auteur: s.profil.pseudo,
          signe: s.profil.initie ? s.profil.signe : undefined,
          type: "Membre",
          heure: "à l'instant",
          contenu,
          image: avecImage,
          reactions: 0,
          commentaires: [],
        },
        ...s.posts,
      ],
    }));
  },
  reagir(id: string) {
    setState((s) => {
      const actif = !s.reactions[id];
      return {
        reactions: { ...s.reactions, [id]: actif },
        posts: s.posts.map((p) =>
          p.id === id ? { ...p, reactions: p.reactions + (actif ? 1 : -1) } : p,
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
                { id: `c-${Date.now()}`, auteur: s.profil.pseudo, texte, heure: "à l'instant" },
              ],
            }
          : p,
      ),
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
      s.demandesEnvoyees.includes(id)
        ? {}
        : { demandesEnvoyees: [...s.demandesEnvoyees, id] },
    );
  },
  majProfil(patch: Partial<Profil>) {
    setState((s) => ({ profil: { ...s.profil, ...patch }, onboarded: true }));
  },
};
