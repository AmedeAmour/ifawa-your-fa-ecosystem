import { useFaCorpus } from "@/hooks/use-fa-corpus";
import { SearchField } from "./SearchField";
import { AudioRecorder } from "./AudioRecorder";
import { matchesSearch } from "@/lib/search-text";
import { SignDossier } from "./SignDossier";
import { BasicSignPage } from "./BasicSignPage";
import { faSignCatalog } from "@/data/fa-signs";
import coverImage from "@/assets/cover.jpg";
import { useRefresh } from "@/hooks/use-refresh";
import { loadFeedFromSupabase } from "@/lib/ifawa-social";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  FileText,
  Lock,
  Search,
  Send,
  Shield,
  UserMinus,
  Users,
} from "lucide-react";
import {
  avisPraticiens,
  consultationsAdmin,
  contributionsAdmin,
  formulesAccompagnement,
  formulesConsultation,
  formulesEtude,
  membres,
  partenaires,
  services as mockServices,
  signes,
  syntheseRapport,
  timelineConsultation,
} from "@/data/mock";
import { actions, useApp } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  createContribution,
  loadMyContributions,
  readCachedContributions,
  resubmitContribution,
  type ContributionItem,
} from "@/lib/ifawa-contributions";
import {
  createServiceRequest,
  fetchServiceCatalog,
  loadMyServiceRequests,
  readCachedServiceCatalog,
  readCachedServiceRequests,
  type ServiceCard,
  type ServiceRequest,
} from "@/lib/ifawa-services";
import { loadCurrentProfile, updateProfileSettings, uploadProfileAvatar } from "@/lib/ifawa-auth";
import {
  answerRemoteConnection,
  findOrCreateConversation,
  loadConversationsFromSupabase,
  loadMemberProfile,
  loadNetworkFromSupabase,
  loadNotificationsFromSupabase,
  markConversationRead,
  readCachedConversations,
  readCachedNetwork,
  readCachedNotifications,
  removeRemoteConnection,
  sendRemoteConnection,
  sendRemoteMessage,
  type ConversationItem,
  type NetworkMember,
} from "@/lib/ifawa-social";
import {
  Btn,
  Chip,
  Empty,
  Field,
  Kicker,
  Monogram,
  PageTitle,
  Panel,
  inputCls,
} from "./primitives";
import { PostCard } from "./PostCard";
import { Shell } from "./Shell";

const serviceCopy: Record<string, { title: string; kicker: string; intro: string }> = {
  consultation: {
    title: "Consultation Fa",
    kicker: "Service encadré",
    intro: "Posez une préoccupation et suivez le dossier depuis votre espace personnel.",
  },
  initiation: {
    title: "Demande d'initiation",
    kicker: "Parcours préparatoire",
    intro: "Un parcours clair pour exprimer votre situation, votre zone et votre disponibilité.",
  },
  etude: {
    title: "Étude approfondie du signe",
    kicker: "Avis croisés",
    intro: "Plusieurs lectures sont regroupées dans une synthèse comparative structurée.",
  },
  accompagnement: {
    title: "Accompagnement Fa",
    kicker: "Suivi dans la durée",
    intro: "Un cadre de suivi régulier avec carnet, questions et comptes rendus.",
  },
};

const serviceRequestLabels: Record<string, string> = {
  fa_consultation: "Consultation Fa",
  initiation_request: "Demande d'initiation",
  sign_deep_study: "Étude approfondie du signe",
  fa_accompaniment: "Accompagnement Fa",
};

const serviceStatusLabels: Record<string, string> = {
  submitted: "Reçue",
  reviewing: "En analyse",
  processing: "En traitement",
  completed: "Terminée",
  cancelled: "Annulée",
};

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ReseauPage() {
  const navigate = useNavigate();
  const { currentUserId } = useApp();
  const [remoteNetwork, setRemoteNetwork] = useState<Awaited<
    ReturnType<typeof loadNetworkFromSupabase>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"suggestions" | "invitations" | "connections">("suggestions");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<NetworkMember | null>(null);
  const [networkStatus, setNetworkStatus] = useState("");

  const refreshNetwork = useCallback(async () => {
    try {
      const next = await loadNetworkFromSupabase();
      if (!actions.isCurrentUser(currentUserId)) return;
      setRemoteNetwork(next ?? { received: [], sent: [], accepted: [], suggestions: [] });
      const notifications = await loadNotificationsFromSupabase();
      if (notifications) actions.remplacerNotifications(notifications);
    } catch {
      setNetworkStatus(
        "Le réseau n’a pas pu être actualisé. Vos dernières connexions restent affichées.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    const cached = readCachedNetwork(currentUserId);
    if (cached) {
      setRemoteNetwork(cached);
      setLoading(false);
    }
    void refreshNetwork();
  }, [currentUserId, refreshNetwork]);

  const network = remoteNetwork ?? { received: [], sent: [], accepted: [], suggestions: [] };
  const searchable = query.trim().toLowerCase();
  const matches = (member: NetworkMember) =>
    !searchable || `${member.pseudo} ${member.signe}`.toLowerCase().includes(searchable);
  const accepted = network.accepted.filter(matches);
  const suggestions = [...network.sent, ...network.suggestions].filter(matches);
  const received = network.received.filter(matches);

  async function networkAction(action: () => Promise<unknown>) {
    setNetworkStatus("");
    setBusy(true);
    try {
      await action();
      await refreshNetwork();
    } catch {
      setNetworkStatus("Cette action n’a pas pu être enregistrée. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  function openConversation(member: NetworkMember) {
    setNetworkStatus("");
    setSelected(null);
    navigate({
      to: "/messages",
      search: { peer: member.id } as never,
    });
  }

  const visibleMembers =
    tab === "suggestions" ? suggestions : tab === "invitations" ? received : accepted;
  return (
    <Shell>
      <PageTitle kicker="La communauté Ifawa">Réseau</PageTitle>
      <SearchField value={query} onChange={setQuery} placeholder="Rechercher un membre…" />
      <div className="mb-5 grid grid-cols-3 gap-2" role="group" aria-label="Afficher les membres">
        {(
          [
            ["suggestions", "Découvrir", network.suggestions.length + network.sent.length],
            ["invitations", "Invitations", network.received.length],
            ["connections", "Connexions", network.accepted.length],
          ] as const
        ).map(([value, label, count]) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
            className={cn(
              "flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition-colors sm:text-sm",
              tab === value ? "bg-forest text-ivory" : "bg-card text-umber hover:bg-ivory-deep",
            )}
          >
            {label}
            {value === "invitations" && count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs",
                  tab === value ? "bg-white/15" : "bg-umber/5",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>
      {networkStatus && (
        <p role="status" className="mb-4 rounded-xl bg-clay/10 p-3 text-sm text-clay">
          {networkStatus}
        </p>
      )}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {tab === "suggestions"
            ? "Des membres à découvrir"
            : tab === "invitations"
              ? "Vos invitations"
              : "Vos connexions"}
        </h2>
        <Users aria-hidden="true" className="size-5 text-umber-soft" />
      </div>
      {loading ? (
        <Empty titre="Chargement du réseau" texte="Vos membres et invitations arrivent." />
      ) : visibleMembers.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleMembers.map((member) => (
            <RemoteMemberRow key={member.id} member={member} onSelect={() => setSelected(member)}>
              {tab === "invitations" ? (
                <>
                  <Btn
                    full
                    disabled={busy}
                    onClick={() => {
                      if (member.requestId)
                        void networkAction(() =>
                          answerRemoteConnection(member.requestId!, "accepted"),
                        );
                    }}
                  >
                    Confirmer
                  </Btn>
                  <Btn
                    full
                    variant="quiet"
                    disabled={busy}
                    onClick={() => {
                      if (member.requestId)
                        void networkAction(() =>
                          answerRemoteConnection(member.requestId!, "rejected"),
                        );
                    }}
                  >
                    Refuser
                  </Btn>
                </>
              ) : tab === "connections" ? (
                <>
                  <Btn full variant="quiet" onClick={() => openConversation(member)}>
                    <Send className="size-4" /> Message
                  </Btn>
                  {member.requestId && (
                    <button
                      type="button"
                      disabled={busy}
                      aria-label={"Retirer la connexion avec " + member.pseudo}
                      className="grid size-11 shrink-0 place-items-center rounded-xl text-umber-soft hover:bg-clay/10 hover:text-clay disabled:opacity-50"
                      onClick={() =>
                        void networkAction(() => removeRemoteConnection(member.requestId!))
                      }
                    >
                      <UserMinus className="size-4" />
                    </button>
                  )}
                </>
              ) : member.status === "pending" ? (
                <span className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest/5 text-sm font-medium text-forest">
                  <Check className="size-4" /> Invitation envoyée
                </span>
              ) : (
                <Btn
                  full
                  variant="quiet"
                  disabled={busy}
                  onClick={() => void networkAction(() => sendRemoteConnection(member.id))}
                >
                  <Users className="size-4" /> Ajouter
                </Btn>
              )}
            </RemoteMemberRow>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-umber/10 bg-card px-5 py-8 text-center">
          <Users aria-hidden="true" className="mx-auto mb-3 size-8 text-forest/50" />
          <Empty
            titre={
              query
                ? "Aucun membre trouvé"
                : tab === "invitations"
                  ? "Vous êtes à jour"
                  : tab === "connections"
                    ? "Votre réseau commence ici"
                    : "Aucune suggestion pour le moment"
            }
            texte={
              query
                ? "Essayez un autre nom."
                : tab === "invitations"
                  ? "Vos prochaines invitations apparaîtront ici."
                  : tab === "connections"
                    ? "Découvrez des membres et ajoutez vos premières connexions."
                    : "Revenez découvrir les nouveaux membres de la communauté."
            }
          />
          {tab === "connections" && (
            <Btn className="mt-5" variant="quiet" onClick={() => setTab("suggestions")}>
              Découvrir les membres
            </Btn>
          )}
        </div>
      )}
      {selected && (
        <ProfilePreview
          member={selected}
          onClose={() => setSelected(null)}
          onWrite={() => openConversation(selected)}
        />
      )}
    </Shell>
  );
}

export function MessagesPage() {
  const { currentUserId } = useApp();
  const messageSearch = useRouterState({
    select: (state) =>
      state.location.search as { conversation?: string | undefined; peer?: string },
  });
  const [active, setActive] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = drafts[active] ?? "";
  const setDraft = (text: string) => setDrafts((previous) => ({ ...previous, [active]: text }));
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const messageListRef = useRef<HTMLDivElement>(null);
  const lastConversationRef = useRef("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState<ConversationItem[]>([]);
  const [pendingPeer, setPendingPeer] = useState<NetworkMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageStatus, setMessageStatus] = useState("");
  const conversation = localMessages.find((c) => c.id === active);
  const pendingConversation =
    !conversation && pendingPeer && active === `peer:${pendingPeer.id}`
      ? {
          id: `peer:${pendingPeer.id}`,
          pseudo: pendingPeer.pseudo,
          avatarUrl: pendingPeer.avatarUrl,
          extrait: "Nouvelle conversation",
          heure: "",
          nonLus: 0,
          messages: [],
        }
      : null;
  const currentConversation = conversation ?? pendingConversation;
  const latestVisibleMessageId = currentConversation?.messages.at(-1)?.id;
  useEffect(() => {
    if (!currentUserId) return;
    window.dispatchEvent(
      new CustomEvent("ifawa:badge-hint", {
        detail: { messages: localMessages.reduce((sum, item) => sum + item.nonLus, 0) },
      }),
    );
  }, [localMessages, currentUserId]);

  const refreshMessages = useCallback(async () => {
    try {
      const remote = await loadConversationsFromSupabase();
      if (actions.isCurrentUser(currentUserId)) setLocalMessages(remote ?? []);
    } catch {
      setMessageStatus(
        "Les messages n’ont pas pu être actualisés. Vos derniers échanges restent affichés.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);
  useRefresh(refreshMessages, 12000);

  useEffect(() => {
    setActive("");
    setDrafts({});
    setPendingPeer(null);
    setLocalMessages([]);
    const cached = readCachedConversations(currentUserId);
    if (cached) {
      setLocalMessages(cached);
      setLoading(false);
    }
    void refreshMessages();
  }, [currentUserId, refreshMessages]);

  useEffect(() => {
    if (messageSearch.conversation) {
      setPendingPeer(null);
      setActive(messageSearch.conversation);
      return;
    }
    if (!messageSearch.peer) return;
    let cancelled = false;
    loadMemberProfile(messageSearch.peer)
      .then((member) => {
        if (cancelled || !member) return;
        setPendingPeer(member);
        setActive(`peer:${member.id}`);
      })
      .catch(() => {
        if (!cancelled) setMessageStatus("Impossible d'ouvrir ce membre pour le moment.");
      });
    return () => {
      cancelled = true;
    };
  }, [messageSearch.conversation, messageSearch.peer]);

  useEffect(() => {
    if (!active || active.startsWith("peer:") || !latestVisibleMessageId) return;
    markConversationRead(active, latestVisibleMessageId)
      .then(() => Promise.all([loadConversationsFromSupabase(), loadNotificationsFromSupabase()]))
      .then(([conversations, notifications]) => {
        if (!actions.isCurrentUser(currentUserId)) return;
        if (conversations) {
          const nextConversations = conversations;
          setLocalMessages(nextConversations);
          window.dispatchEvent(
            new CustomEvent("ifawa:badge-hint", {
              detail: { messages: nextConversations.reduce((sum, item) => sum + item.nonLus, 0) },
            }),
          );
        }
        if (notifications) actions.remplacerNotifications(notifications);
      })
      .catch(() => {
        if (actions.isCurrentUser(currentUserId))
          setMessageStatus(
            "La lecture n’a pas pu être synchronisée. Vérifiez votre connexion ; nous réessaierons à la prochaine ouverture.",
          );
      });
  }, [active, currentUserId, latestVisibleMessageId]);

  const messageCount = currentConversation?.messages.length ?? 0;
  useEffect(() => {
    const list = messageListRef.current;
    if (
      list &&
      (lastConversationRef.current !== active ||
        list.scrollHeight - list.scrollTop - list.clientHeight < 160)
    )
      list.scrollTop = list.scrollHeight;
    lastConversationRef.current = active;
  }, [active, messageCount]);
  const shownConversations = localMessages.filter(
    (item) =>
      (!unreadOnly || item.nonLus > 0) &&
      (!query.trim() || matchesSearch(item.pseudo + " " + item.extrait, query)),
  );

  return (
    <Shell wide>
      <div
        className={cn("mb-5 flex items-center justify-between gap-3", active && "hidden lg:flex")}
      >
        <div>
          <p className="mb-1 text-xs font-medium text-clay">Gardez le lien</p>
          <h1 className="text-3xl font-semibold tracking-tight">Messages</h1>
        </div>
        <Link
          to="/reseau"
          aria-label="Nouvelle conversation"
          className="grid size-11 place-items-center rounded-full bg-card text-forest ring-1 ring-umber/10 hover:bg-ivory-deep"
        >
          <Send className="size-5" />
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.3fr)]">
        <section
          aria-label="Vos conversations"
          className={cn(
            "min-w-0 rounded-2xl border border-umber/10 bg-card p-3 lg:max-h-[calc(100dvh-13rem)] lg:overflow-y-auto",
            active && "hidden lg:block",
          )}
        >
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Rechercher une conversation…"
          />
          <div className="mb-3 flex gap-2" role="group" aria-label="Filtrer les conversations">
            <button
              type="button"
              aria-pressed={!unreadOnly}
              onClick={() => setUnreadOnly(false)}
              className={cn(
                "min-h-10 rounded-full px-3 text-sm font-semibold",
                !unreadOnly ? "bg-forest/10 text-forest" : "text-umber-soft",
              )}
            >
              Toutes
            </button>
            <button
              type="button"
              aria-pressed={unreadOnly}
              onClick={() => setUnreadOnly(true)}
              className={cn(
                "min-h-10 rounded-full px-3 text-sm font-semibold",
                unreadOnly ? "bg-forest/10 text-forest" : "text-umber-soft",
              )}
            >
              Non lues
            </button>
          </div>
          {!active && messageStatus && (
            <p role="status" className="mb-3 text-sm text-clay">
              {messageStatus}
            </p>
          )}
          {loading ? (
            <Empty titre="Chargement" texte="Ouverture de vos conversations." />
          ) : shownConversations.length ? (
            shownConversations.map((item) => (
              <button
                key={item.id}
                disabled={sending}
                aria-pressed={active === item.id}
                onClick={() => {
                  setPendingPeer(null);
                  setMessageStatus("");
                  setActive(item.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors",
                  active === item.id ? "bg-forest/10 text-forest" : "hover:bg-ivory-deep/60",
                )}
              >
                <Monogram name={item.pseudo} imageUrl={item.avatarUrl} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{item.pseudo}</span>
                  <span
                    className={cn(
                      "block truncate text-[12px]",
                      item.nonLus > 0 ? "font-semibold text-umber" : "text-umber-soft",
                    )}
                  >
                    {item.extrait}
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-[10px] text-umber-soft">{item.heure}</span>
                  {item.nonLus > 0 && (
                    <span className="grid size-5 place-items-center rounded-full bg-clay font-mono text-[9px] text-ivory">
                      {item.nonLus}
                    </span>
                  )}
                </span>
              </button>
            ))
          ) : (
            <div className="py-8 text-center">
              <Empty
                titre={
                  query
                    ? "Aucun résultat"
                    : unreadOnly
                      ? "Tout est lu"
                      : "Vos échanges commencent ici"
                }
                texte={
                  query
                    ? "Essayez un autre nom."
                    : unreadOnly
                      ? "Vous n’avez aucune conversation non lue."
                      : "Retrouvez vos connexions et commencez une conversation."
                }
              />
              <Btn to="/reseau" variant="quiet">
                Voir mon réseau
              </Btn>
            </div>
          )}
        </section>

        {currentConversation ? (
          <section
            aria-label={"Conversation avec " + currentConversation.pseudo}
            className="flex h-[calc(100dvh-14rem)] min-h-72 min-w-0 flex-col overflow-hidden rounded-2xl border border-umber/10 bg-card shadow-sm lg:h-[calc(100dvh-13rem)]"
          >
            <div className="flex shrink-0 items-center gap-3 border-b border-umber/10 bg-card p-4">
              <button
                type="button"
                disabled={sending}
                onClick={() => setActive("")}
                className="grid size-11 shrink-0 place-items-center rounded-full text-umber-soft hover:bg-ivory-deep lg:hidden"
                aria-label="Retour aux conversations"
              >
                <ChevronLeft className="size-5" />
              </button>
              <Monogram
                name={currentConversation.pseudo}
                imageUrl={currentConversation.avatarUrl}
                size={42}
              />
              <div className="min-w-0">
                <h2 className="truncate font-semibold">{currentConversation.pseudo}</h2>
                <p className="mt-0.5 text-xs text-umber-soft">Conversation privée</p>
              </div>
            </div>
            {messageStatus && <p className="mb-3 text-[13px] text-clay">{messageStatus}</p>}
            <div
              ref={messageListRef}
              role="log"
              aria-label="Messages de la conversation"
              aria-live="polite"
              className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-ivory/40 p-4"
            >
              {currentConversation.messages.length ? (
                currentConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere]",
                      message.de === "moi"
                        ? "ml-auto rounded-br-md bg-forest text-ivory"
                        : "rounded-bl-md bg-ivory-deep text-umber",
                    )}
                  >
                    {message.texte}
                    <span
                      className={cn(
                        "label-mono mt-1 block",
                        message.de === "moi" ? "text-ivory/55" : "text-umber-soft/70",
                      )}
                    >
                      {message.heure}
                    </span>
                  </div>
                ))
              ) : (
                <Empty
                  titre="Conversation prête"
                  texte="Écrivez votre premier message pour démarrer l'échange."
                />
              )}
            </div>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (!draft.trim() || sending) return;
                const message = draft.trim();
                setSending(true);
                setMessageStatus("");
                try {
                  let targetId = currentConversation.id;
                  if (targetId.startsWith("peer:")) {
                    const createdId = await findOrCreateConversation(targetId.slice(5));
                    if (!createdId) throw new Error("Conversation indisponible.");
                    targetId = createdId;
                  }
                  await sendRemoteMessage(targetId, message);
                  setDraft("");
                  setActive(targetId);
                  setPendingPeer(null);
                  await refreshMessages();
                } catch (error) {
                  setMessageStatus(
                    error instanceof Error
                      ? error.message + " Votre texte est conservé."
                      : "Le message n’a pas pu être envoyé. Votre texte est conservé, réessayez.",
                  );
                } finally {
                  setSending(false);
                }
              }}
              className="flex shrink-0 items-end gap-2 border-t border-umber/10 bg-card p-3"
            >
              <textarea
                rows={1}
                className="min-h-11 max-h-28 min-w-0 flex-1 resize-y rounded-2xl border border-umber/10 bg-ivory-deep/60 px-4 py-3 text-base outline-none focus:border-clay"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                aria-label="Votre message"
                disabled={sending}
                placeholder="Écrire un message…"
              />
              <button
                aria-label={sending ? "Envoi en cours" : "Envoyer le message"}
                type="submit"
                disabled={sending || !draft.trim()}
                className="grid size-11 shrink-0 place-items-center rounded-full bg-forest text-ivory transition-colors hover:bg-forest/90 disabled:opacity-40"
              >
                <Send aria-hidden="true" className={cn("size-5", sending && "animate-pulse")} />
              </button>
            </form>
          </section>
        ) : (
          <Panel tone="deep" className="hidden items-center justify-center lg:flex">
            <Empty
              titre="Sélectionnez une conversation"
              texte="Choisissez un échange dans la liste pour lire et répondre."
            />
          </Panel>
        )}
      </div>
    </Shell>
  );
}

export function ProfilPage() {
  const { profil, posts, currentUserId } = useApp();
  const [tab, setTab] = useState("publications");
  const [profileLimit, setProfileLimit] = useState(20);
  const [profileError, setProfileError] = useState("");
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [profileNetwork, setProfileNetwork] = useState<NetworkMember[]>([]);
  useEffect(() => {
    if (!currentUserId) return;
    let alive = true;
    Promise.all([
      loadFeedFromSupabase({ authorId: currentUserId, limit: profileLimit }),
      loadMyContributions(),
      loadNetworkFromSupabase(),
    ])
      .then(([feed, contributions, network]) => {
        if (!alive || !actions.isCurrentUser(currentUserId)) return;
        if (feed) actions.remplacerPosts(feed.posts, feed.reactions);
        setContributions(contributions);
        setProfileNetwork(network?.accepted ?? []);
        setProfileError("");
      })
      .catch(() => {
        if (alive)
          setProfileError(
            "Certaines informations n’ont pas pu être chargées. Réessayez en revenant sur ce profil.",
          );
      });
    return () => {
      alive = false;
    };
  }, [currentUserId, profileLimit]);
  const [connectionCount, setConnectionCount] = useState(
    readCachedNetwork(currentUserId)?.accepted.length ?? 0,
  );
  const ownPosts = posts.filter((post) =>
    currentUserId ? post.authorId === currentUserId : post.auteur === profil.pseudo,
  );

  useEffect(() => {
    const cached = readCachedNetwork(currentUserId);
    if (cached) setConnectionCount(cached.accepted.length);
    loadNetworkFromSupabase()
      .then((items) => {
        if (items) setConnectionCount(items.accepted.length);
      })
      .catch(() => {});
  }, [currentUserId]);

  return (
    <Shell>
      <Panel tone="forest" className="relative mb-5 overflow-hidden p-0">
        <div
          className="h-40 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        <div className="relative z-10 -mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative z-20 rounded-full border-4 border-forest bg-forest">
              <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={82} tone="clay" />
            </div>
            <div>
              <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
                {profil.pseudo}
              </h1>
              <p className="mt-2 text-[13px] text-ivory/70">
                {connectionCount} connexions ·{" "}
                {profil.initie
                  ? `${profil.signe || "Signe non renseigné"}${profil.annee ? ` · initié en ${profil.annee}` : ""}`
                  : "Espace découverte"}
              </p>
            </div>
          </div>
          <Btn
            to="/parametres"
            variant="outline"
            className="border-ivory/25 text-ivory hover:bg-ivory/10"
          >
            Modifier
          </Btn>
        </div>
      </Panel>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {["publications", "à propos", "connexions", "contributions", "parcours"].map((item) => (
          <Chip key={item} active={tab === item} onClick={() => setTab(item)}>
            {item}
          </Chip>
        ))}
      </div>

      {tab === "publications" && (
        <>
          <Panel tone="deep" className="mb-4">
            <div className="flex items-start gap-3">
              <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={40} />
              <div className="flex-1">
                <p className="text-[14px] text-umber-soft">
                  Publiez une pensée, une question ou une contribution depuis le fil.
                </p>
                <Btn to="/accueil" className="mt-3">
                  Publier depuis le fil
                </Btn>
              </div>
            </div>
          </Panel>
          {ownPosts.length ? (
            ownPosts.map((post, index) => <PostCard key={post.id} post={post} index={index} />)
          ) : (
            <Empty
              titre="Aucune publication personnelle"
              texte="Vos publications apparaîtront ici."
            />
          )}
        </>
      )}
      {profileError && (
        <p role="alert" className="mb-4 text-sm text-clay">
          {profileError}
        </p>
      )}
      {tab === "publications" && ownPosts.length >= profileLimit && (
        <Btn variant="outline" onClick={() => setProfileLimit((n) => n + 20)}>
          Voir plus
        </Btn>
      )}
      {tab === "à propos" && (
        <Panel>
          <h2 className="mb-3 text-lg font-semibold">À propos de moi</h2>
          <p className="whitespace-pre-wrap text-base leading-relaxed">
            {profil.temoignage || "Vous n’avez pas encore ajouté de présentation."}
          </p>
          <Btn to="/parametres" variant="outline" className="mt-4">
            Compléter mon profil
          </Btn>
        </Panel>
      )}
      {tab === "connexions" && (
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Mes connexions</h2>
          <div className="space-y-3">
            {profileNetwork.length ? (
              profileNetwork.map((member) => (
                <RemoteMemberRow key={member.id} member={member}>
                  <Link
                    to="/messages"
                    search={{ peer: member.id } as never}
                    className="inline-flex min-h-11 items-center rounded-xl bg-clay px-4 text-sm font-semibold text-ivory"
                  >
                    Écrire
                  </Link>
                </RemoteMemberRow>
              ))
            ) : (
              <Empty
                titre="Aucune connexion"
                texte="Retrouvez la communauté depuis l’onglet Réseau."
              />
            )}
          </div>
        </Panel>
      )}
      {tab === "contributions" && (
        <div className="space-y-3">
          {contributions.length ? (
            contributions.map((item) => (
              <MyContributionCard
                key={item.id}
                item={item}
                onResubmitted={async () => setContributions(await loadMyContributions())}
              />
            ))
          ) : (
            <Empty
              titre="Aucune contribution"
              texte="Proposez un contenu à la bibliothèque pour commencer."
            />
          )}
          <Btn to="/contribuer" variant="outline">
            Proposer une contribution
          </Btn>
        </div>
      )}
      {tab === "parcours" && (
        <Panel>
          <h2 className="mb-3 text-lg font-semibold">Mon parcours</h2>
          <p>{profil.initie ? "Parcours initié" : "Parcours découverte"}</p>
          <p className="mt-2 text-sm text-umber-soft">
            {profil.signe || "Signe non renseigné"}
            {profil.annee ? " · " + profil.annee : ""}
          </p>
          <Btn to="/carnet" variant="outline" className="mt-4">
            Ouvrir mon historique
          </Btn>
        </Panel>
      )}
      <Panel className="mt-5">
        <h2 className="mb-4 text-lg font-semibold">Mon espace</h2>
        <div className="grid grid-cols-2 gap-3">
          <Btn to="/dossier" variant="quiet">
            Mes dossiers
          </Btn>
          <Btn to="/services" variant="quiet">
            Services
          </Btn>
          <Btn to="/carnet" variant="quiet">
            Mon historique
          </Btn>
          <Btn to="/parametres" variant="quiet">
            Mes réglages
          </Btn>
        </div>
      </Panel>
    </Shell>
  );
}

function MyContributionCard({
  item,
  onResubmitted,
}: {
  item: ContributionItem;
  onResubmitted: () => Promise<void>;
}) {
  const [body, setBody] = useState(item.body);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const label =
    (
      {
        submitted: "En attente de relecture",
        under_review: "En cours d’examen",
        needs_review: "Correction demandée",
        approved: "Validée",
        rejected: "Non retenue",
        archived: "Archivée",
      } as Record<string, string>
    )[item.status] ?? item.status;

  async function submitCorrection() {
    setBusy(true);
    setMessage("");
    try {
      await resubmitContribution(item.id, body);
      await onResubmitted();
      setEditing(false);
      setMessage("Contribution corrigée et renvoyée à l’équipe.");
    } catch (reason) {
      setMessage(
        reason instanceof Error ? reason.message : "La correction n’a pas pu être envoyée.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <p className="text-sm text-clay">
        {item.categoryLabel} · {label}
      </p>
      <h2 className="mt-2 text-lg font-semibold">{item.title}</h2>
      {item.reviewerNote && (
        <div className="mt-3 rounded-xl bg-clay/10 p-3 text-sm">
          <p className="font-medium">Note de l’équipe IFAWA</p>
          <p className="mt-1 text-umber-soft">{item.reviewerNote}</p>
        </div>
      )}
      {editing ? (
        <div className="mt-3">
          <textarea
            className={cn(inputCls, "min-h-36")}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn type="button" disabled={busy} onClick={() => void submitCorrection()}>
              {busy ? "Envoi…" : "Renvoyer à validation"}
            </Btn>
            <Btn type="button" variant="quiet" disabled={busy} onClick={() => setEditing(false)}>
              Annuler
            </Btn>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap leading-relaxed">{item.body}</p>
      )}
      {item.status === "needs_review" && !editing && (
        <Btn type="button" variant="outline" className="mt-4" onClick={() => setEditing(true)}>
          Corriger la contribution
        </Btn>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm text-clay">
          {message}
        </p>
      )}
    </Panel>
  );
}

export function ServicesPage() {
  const [catalog, setCatalog] = useState<ServiceCard[]>(() => readCachedServiceCatalog());

  useEffect(() => {
    let cancelled = false;
    fetchServiceCatalog().then((items) => {
      if (!cancelled) setCatalog(items);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <PageTitle kicker="Services IFAWA">Choisir une demande</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {catalog.map((service, index) => (
          <Link
            key={service.slug}
            to="/services/$slug"
            params={{ slug: service.slug }}
            className={cn(
              "animate-rise p-5 transition-transform hover:-translate-y-0.5",
              index === 0 ? "rounded-2xl bg-forest text-ivory" : "bg-card carved",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Kicker className={index === 0 ? "text-brass" : undefined}>
              Service {String(index + 1).padStart(2, "0")}
            </Kicker>
            <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight">
              {service.titre}
            </h2>
            <p
              className={cn(
                "mt-3 text-[13px] leading-relaxed",
                index === 0 ? "text-ivory/75" : "text-umber-soft",
              )}
            >
              {service.description}
            </p>
            <span className={cn("label-mono mt-5 block", index === 0 ? "text-brass" : "text-clay")}>
              Ouvrir →
            </span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

export function ServiceDetailPage({ slug }: { slug: string }) {
  const copy = serviceCopy[slug];
  const formules =
    slug === "initiation"
      ? []
      : slug === "etude"
        ? formulesEtude
        : slug === "accompagnement"
          ? formulesAccompagnement
          : formulesConsultation;
  const [selectedFormula, setSelectedFormula] = useState(formules[0]?.nom ?? "");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [details, setDetails] = useState("");
  const [audio, setAudio] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const defaultFormula = formules[0]?.nom ?? "";
  useEffect(() => setSelectedFormula(defaultFormula), [defaultFormula]);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recording || submitting) return;
    if (!subject.trim() && !audio) {
      setStatus("Écrivez votre préoccupation ou ajoutez un audio.");
      return;
    }
    setSubmitting(true);
    setStatus("Enregistrement de la demande...");
    try {
      const reference = await createServiceRequest({
        serviceSlug: slug,
        formulaName: selectedFormula,
        subject: subject.trim(),
        deadline: deadline.trim(),
        details: details.trim(),
        audio,
      });
      setSubject("");
      setDeadline("");
      setDetails("");
      setAudio(null);
      setStatus(`Demande enregistrée. Référence ${reference.slice(0, 8).toUpperCase()}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "La demande n'a pas pu être enregistrée.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!copy)
    return (
      <Shell>
        <Empty titre="Service introuvable" texte="Choisissez un service dans le catalogue." />
        <Btn to="/services">Voir les services</Btn>
      </Shell>
    );
  return (
    <Shell>
      <PageTitle
        kicker={copy.kicker}
        action={
          <Btn to="/services" variant="ghost">
            Services
          </Btn>
        }
      >
        {copy.title}
      </PageTitle>
      <p className="mb-5 text-base leading-relaxed text-umber-soft">{copy.intro}</p>
      <p className="mb-4 text-sm text-umber-soft">
        {slug === "initiation"
          ? "Décrivez votre situation et votre disponibilité. Les modalités seront précisées après étude de votre demande."
          : "Tarifs indicatifs en FCFA (XOF), à confirmer avec l’équipe. Aucun paiement n’est effectué lors de cette demande."}
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {formules.map((formule) => (
          <button
            key={formule.nom}
            type="button"
            aria-pressed={selectedFormula === formule.nom}
            onClick={() => setSelectedFormula(formule.nom)}
            className="text-left"
          >
            <Panel
              tone="paper"
              className={cn(
                "h-full transition-transform hover:-translate-y-0.5",
                selectedFormula === formule.nom && "ring-2 ring-clay/40",
              )}
            >
              <Kicker className="text-clay">
                {selectedFormula === formule.nom
                  ? "✓ Sélectionnée"
                  : formule.recommande
                    ? "Recommandée"
                    : "Formule"}
              </Kicker>
              <h2 className="mt-3 font-display text-[25px] font-semibold leading-tight tracking-tight">
                {formule.nom}
              </h2>
              <p className={cn("mt-3 text-[13px]", "text-umber-soft")}>
                {"delai" in formule ? formule.delai : formule.suivi}
              </p>
              <p className="mt-4 font-semibold">{formule.prix}</p>
            </Panel>
          </button>
        ))}
      </div>
      <Panel className="mt-5">
        <SectionHeader icon={FileText} title="Créer la demande" />
        <form onSubmit={submitRequest} className="grid gap-3 sm:grid-cols-2">
          <Field label="Objet">
            <input
              className={inputCls}
              placeholder="Votre préoccupation"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </Field>
          <Field label="Délai">
            <input
              className={inputCls}
              placeholder="Standard, prioritaire..."
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Détails">
              <textarea
                className={cn(inputCls, "min-h-28")}
                placeholder="Décrivez la demande..."
                value={details}
                onChange={(event) => setDetails(event.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <AudioRecorder
              file={audio}
              onChange={setAudio}
              onRecordingChange={setRecording}
              disabled={submitting}
            />
            <Btn type="submit" className="mt-4" disabled={submitting || recording}>
              {submitting ? "Envoi..." : "Envoyer la demande"}
            </Btn>
            {status && <p className="mt-3 text-[13px] text-umber-soft">{status}</p>}
          </div>
        </form>
      </Panel>
    </Shell>
  );
}

export function SigneDetailPage({ slug }: { slug: string }) {
  const documents = useFaCorpus();
  const signe = documents.find((item) => item.slug === slug);
  if (signe) return <SignDossier key={slug} signe={signe} />;
  const catalogSign = faSignCatalog.find((item) => item.slug === slug);
  if (catalogSign) return <BasicSignPage key={slug} sign={catalogSign} />;
  return (
    <Shell>
      <Empty
        titre="Signe introuvable"
        texte="Retrouvez les signes disponibles dans la bibliothèque."
      />
      <Btn to="/fa">Bibliothèque</Btn>
    </Shell>
  );
}
export function RecherchePage() {
  const documents = useFaCorpus();
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [catalog, setCatalog] = useState<ServiceCard[]>(mockServices);
  const [postResults, setPostResults] = useState<import("@/data/mock").Post[]>([]);
  const [searchError, setSearchError] = useState("");
  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => {
      if (!q.trim()) {
        setPostResults([]);
        return;
      }
      loadFeedFromSupabase({ query: q.trim(), limit: 30 })
        .then((result) => {
          if (alive) {
            setPostResults((result?.posts ?? []).filter((post) => matchesSearch(post.contenu, q)));
            setSearchError("");
          }
        })
        .catch(() => {
          if (alive) setSearchError("Les publications n’ont pas pu être recherchées.");
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 350);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [q]);
  const [network, setNetwork] = useState<Awaited<
    ReturnType<typeof loadNetworkFromSupabase>
  > | null>(null);

  useEffect(() => {
    let alive = true;
    fetchServiceCatalog()
      .then((items) => {
        if (alive) setCatalog(items);
      })
      .catch(() => {});
    loadNetworkFromSupabase()
      .then((items) => {
        if (alive) setNetwork(items);
      })
      .catch(() => {
        if (alive) setNetwork(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    const query = q.trim();
    if (!query) return [];
    const remoteMembers = network
      ? [...network.accepted, ...network.received, ...network.sent, ...network.suggestions].map(
          (member) => ({
            title: member.pseudo,
            text: member.signe,
            to: "/reseau",
          }),
        )
      : [];
    return [
      ...documents.map((s) => ({
        title: s.nom,
        text: s.type === "messager" ? "Le messager" : `Signe ${s.ordre ?? ""}`,
        to: `/fa/${s.slug}`,
      })),
      ...remoteMembers,
      ...catalog.map((s) => ({
        title: s.titre,
        text: s.description,
        to: `/services/${s.slug}`,
      })),
    ].filter((item) => matchesSearch(`${item.title} ${item.text}`, query));
  }, [network, q, catalog, documents]);
  return (
    <Shell>
      <PageTitle kicker="Recherche">Trouver rapidement</PageTitle>
      <SearchField
        value={q}
        onChange={(value) => {
          setQ(value);
          setPostResults([]);
          setSearchError("");
          setSearching(Boolean(value.trim()));
        }}
        placeholder="Signe, membre, service, publication…"
      />
      {q.trim() && searching && (
        <p role="status" className="mb-3 text-xs text-umber-soft">
          Recherche des publications…
        </p>
      )}
      {q.trim() && searchError && (
        <p role="alert" className="mb-3 text-sm text-clay">
          {searchError}
        </p>
      )}
      {q.trim() &&
        !searching &&
        !searchError &&
        results.length === 0 &&
        postResults.length === 0 && (
          <Empty
            titre="Aucun résultat"
            texte="Essayez un autre mot ou une orthographe différente."
          />
        )}
      <div className="space-y-3">
        {(q.trim() ? results : []).map((item) => (
          <Link
            key={`${item.to}-${item.title}`}
            to={item.to as never}
            className="block bg-card carved p-4 transition-colors hover:bg-ivory-deep/40"
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-[13px] text-umber-soft">{item.text}</p>
          </Link>
        ))}
        {(q.trim() ? postResults : []).map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </Shell>
  );
}

export function ContribuerPage() {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setStatus("Renseignez le signe concerné et la contribution.");
      return;
    }
    setSubmitting(true);
    setStatus("Envoi de la contribution...");
    try {
      const reference = await createContribution({
        title: title.trim(),
        category: category.trim(),
        body: body.trim(),
      });
      setTitle("");
      setCategory("");
      setBody("");
      setStatus(`Contribution soumise. Référence ${reference.slice(0, 8).toUpperCase()}.`);
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "La contribution n'a pas pu être enregistrée.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <PageTitle kicker="Contribution">Proposer à la bibliothèque</PageTitle>
      <Panel>
        <form onSubmit={submitContribution} className="grid gap-4 sm:grid-cols-2">
          <Field label="Signe concerné">
            <select
              required
              className={inputCls}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            >
              <option value="">Choisir un signe</option>
              {signes.map((s) => (
                <option key={s.slug}>{s.nom}</option>
              ))}
            </select>
          </Field>
          <Field label="Catégorie">
            <input
              className={inputCls}
              placeholder="Enseignement, variante, interdit..."
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Contribution">
              <textarea
                className={cn(inputCls, "min-h-36")}
                placeholder="Décrivez l'information à faire relire."
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Btn type="submit" className="mt-1" disabled={submitting}>
              {submitting ? "Envoi..." : "Soumettre à validation"}
            </Btn>
            {status && <p className="mt-3 text-[13px] text-umber-soft">{status}</p>}
          </div>
        </form>
      </Panel>
    </Shell>
  );
}

export function CarnetPage() {
  const { currentUserId } = useApp();
  const [requests, setRequests] = useState<ServiceRequest[]>(() =>
    readCachedServiceRequests(currentUserId),
  );
  const [contributions, setContributions] = useState<ContributionItem[]>(() =>
    readCachedContributions(currentUserId),
  );
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cachedRequests = readCachedServiceRequests(currentUserId);
    const cachedContributions = readCachedContributions(currentUserId);
    if (cachedRequests.length || cachedContributions.length) {
      setRequests(cachedRequests);
      setContributions(cachedContributions);
      setLoading(false);
    }
    let active = true;
    Promise.all([loadMyServiceRequests(), loadMyContributions()])
      .then(([nextRequests, nextContributions]) => {
        if (!active) return;
        setRequests(nextRequests);
        setContributions(nextContributions);
      })
      .catch(() => {
        if (active)
          setHistoryError("Votre historique n’a pas pu être actualisé. Réessayez plus tard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUserId]);

  const entries = [
    ...requests.map((item) => ({
      id: `service-${item.id}`,
      timestamp: item.createdAt,
      date: formatShortDate(item.createdAt),
      titre: item.subject,
      texte: `${serviceRequestLabels[item.serviceType] ?? item.serviceType} · ${
        serviceStatusLabels[item.status] ?? item.status
      }`,
    })),
    ...contributions.map((item) => ({
      id: `contribution-${item.id}`,
      timestamp: item.createdAt,
      date: formatShortDate(item.createdAt),
      titre: item.title,
      texte: `${item.categoryLabel} · ${({ submitted: "En relecture", approved: "Validée", rejected: "Non retenue" } as Record<string, string>)[item.status] ?? item.status}`,
    })),
  ].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));

  return (
    <Shell>
      <PageTitle kicker="Carnet de parcours">Historique personnel</PageTitle>
      {historyError && (
        <p role="alert" className="mb-4 text-clay">
          {historyError}
        </p>
      )}
      <div className="space-y-4">
        {entries.map((item) => (
          <Panel key={item.id}>
            <Kicker>{item.date}</Kicker>
            <h2 className="mt-2 font-display text-[23px] font-semibold leading-tight tracking-tight">
              {item.titre}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-umber-soft">{item.texte}</p>
          </Panel>
        ))}
        {entries.length === 0 && (
          <Empty
            titre={loading ? "Chargement du carnet" : "Carnet vide"}
            texte={
              loading
                ? "Votre activité personnelle est en cours de récupération."
                : "Vos demandes et contributions apparaîtront ici."
            }
          />
        )}
      </div>
    </Shell>
  );
}

export function NotificationsPage() {
  const { notifications: allNotifications, currentUserId } = useApp();
  const notifications = allNotifications.filter((item) => item.type !== "message");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const cached = readCachedNotifications(currentUserId);
    if (cached) actions.remplacerNotifications(cached);
    loadNotificationsFromSupabase()
      .then((items) => {
        if (items && actions.isCurrentUser(currentUserId)) actions.remplacerNotifications(items);
      })
      .catch(() => {});
  }, [currentUserId]);
  const shown =
    filter === "unread"
      ? notifications.filter((notification) => notification.nonLue)
      : notifications;
  const unread = notifications.filter((notification) => notification.nonLue).length;
  const destination = {
    connexion: "/reseau",
    commentaire: "/accueil",
    contribution: "/contribuer",
    service: "/suivi",
    signe: "/fa",
    message: "/messages",
  } as const;

  return (
    <Shell>
      <PageTitle
        kicker="Notifications"
        action={
          unread > 0 && (
            <Btn variant="ghost" onClick={actions.toutLireNotifications}>
              Tout lire
            </Btn>
          )
        }
      >
        Activité récente
      </PageTitle>
      <div className="mb-5 flex gap-2 overflow-x-auto">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>
          Toutes
        </Chip>
        <Chip active={filter === "unread"} onClick={() => setFilter("unread")}>
          Non lues {unread > 0 ? `(${unread})` : ""}
        </Chip>
      </div>
      <div className="space-y-3">
        {shown.map((notification) => (
          <Link
            key={notification.id}
            to={destination[notification.type]}
            search={
              notification.type === "message" && notification.conversationId
                ? { conversation: notification.conversationId }
                : {}
            }
            onClick={() => actions.lireNotification(notification.id)}
            className="block"
          >
            <Panel
              tone={notification.nonLue ? "deep" : "paper"}
              className="transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full",
                    notification.nonLue ? "bg-clay text-ivory" : "bg-ivory-deep text-umber-soft",
                  )}
                >
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{notification.texte}</p>
                  <p className="label-mono mt-1 text-umber-soft">
                    {notification.heure} · {notification.type}
                  </p>
                </div>
                {notification.nonLue && (
                  <span className="mt-2 size-2 rounded-full bg-clay" aria-hidden />
                )}
              </div>
            </Panel>
          </Link>
        ))}
        {shown.length === 0 && (
          <Empty titre="Aucune notification" texte="Les nouvelles activités apparaîtront ici." />
        )}
      </div>
    </Shell>
  );
}

export function AdminPage() {
  return (
    <Shell>
      <PageTitle kicker="Gestion">Administration</PageTitle>
      <Empty
        titre="Espace de gestion réservé"
        texte="Les outils de modération et de traitement des dossiers seront disponibles après l’activation des accès de l’équipe."
      />
    </Shell>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Users; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="size-4 text-clay" />
      <h2 className="font-display text-[22px] font-semibold leading-tight tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function MemberRow({
  name,
  meta,
  children,
  active,
}: {
  name: string;
  meta: string;
  children: ReactNode;
  active?: boolean | undefined;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-ivory-deep/45 p-3 sm:flex-row sm:flex-wrap sm:items-center",
        active && "outline outline-1 outline-clay/30",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Monogram name={name} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{name}</p>
          <p className="label-mono mt-1 whitespace-normal leading-relaxed text-umber-soft">
            {meta}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:ml-auto">{children}</div>
    </div>
  );
}

function RemoteMemberRow({
  member,
  children,
  onSelect,
}: {
  member: NetworkMember;
  children: ReactNode;
  onSelect?: () => void;
}) {
  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-umber/10 bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 items-center gap-3 rounded-xl text-left focus-visible:outline-2 focus-visible:outline-clay"
      >
        <Monogram name={member.pseudo} imageUrl={member.avatarUrl} size={60} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{member.pseudo}</span>
          <span className="mt-1 block text-xs leading-relaxed text-umber-soft">{member.signe}</span>
        </span>
      </button>
      <div className="mt-4 flex items-center gap-2 [&>button]:text-sm">{children}</div>
    </article>
  );
}

function ProfilePreview({
  member,
  onClose,
  onWrite,
}: {
  member: NetworkMember;
  onClose: () => void;
  onWrite: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-umber/35 p-4 pt-16 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="w-full max-w-lg animate-rise bg-card text-umber shadow-2xl carved">
        <div
          className="h-32 rounded-t-[inherit] bg-cover bg-center"
          style={{ backgroundImage: `url(${coverImage})` }}
        />
        <div className="-mt-10 px-5 pb-5">
          <div className="relative z-10 inline-flex rounded-full border-4 border-card bg-card">
            <Monogram name={member.pseudo} imageUrl={member.avatarUrl} size={76} tone="clay" />
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[28px] font-semibold leading-tight tracking-tight">
                {member.pseudo}
              </h2>
              <p className="label-mono mt-2 text-umber-soft">{member.signe}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-medium text-[13px] text-umber-soft hover:text-clay"
            >
              Fermer
            </button>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-umber-soft">
            Profil membre Ifawa. Vous pouvez consulter les informations publiques et ouvrir un
            échange privé si vous êtes connectés.
          </p>
          <div className="mt-5 flex gap-2">
            <Btn onClick={onWrite}>
              <Send className="size-3.5" /> Écrire
            </Btn>
            <Btn variant="quiet" onClick={onClose}>
              Retour
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Panel tone="deep">
      <Kicker>{title}</Kicker>
      <p className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight">
        {value}
      </p>
    </Panel>
  );
}

function AdminList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Panel>
      <Kicker>{title}</Kicker>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <p key={row} className="rounded-2xl bg-ivory-deep/50 p-3 text-[13px]">
            {row}
          </p>
        ))}
      </div>
    </Panel>
  );
}

export function ComingSoonPage({ title, kicker }: { title: string; kicker: string }) {
  return (
    <Shell>
      <PageTitle kicker={kicker}>{title}</PageTitle>
      <Panel tone="deep">
        <Lock className="mb-4 size-5 text-clay" />
        <p className="max-w-xl text-[14px] leading-relaxed text-umber-soft">
          Cet écran centralise les informations nécessaires à ce parcours.
        </p>
      </Panel>
    </Shell>
  );
}
