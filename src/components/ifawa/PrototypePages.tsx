import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
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
  const [selected, setSelected] = useState<NetworkMember | null>(null);
  const [networkStatus, setNetworkStatus] = useState("");

  async function refreshNetwork() {
    try {
      const next = await loadNetworkFromSupabase();
      setRemoteNetwork(next ?? { received: [], sent: [], accepted: [], suggestions: [] });
      const notifications = await loadNotificationsFromSupabase();
      if (notifications) actions.remplacerNotifications(notifications);
    } catch {
      setRemoteNetwork({ received: [], sent: [], accepted: [], suggestions: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = readCachedNetwork(currentUserId);
    if (cached) {
      setRemoteNetwork(cached);
      setLoading(false);
    }
    void refreshNetwork();
  }, [currentUserId]);

  const network = remoteNetwork ?? { received: [], sent: [], accepted: [], suggestions: [] };
  const searchable = query.trim().toLowerCase();
  const matches = (member: NetworkMember) =>
    !searchable || `${member.pseudo} ${member.signe}`.toLowerCase().includes(searchable);
  const accepted = network.accepted.filter(matches);
  const suggestions = [...network.sent, ...network.suggestions].filter(matches);
  const received = network.received.filter(matches);

  function openConversation(member: NetworkMember) {
    setNetworkStatus("");
    setSelected(null);
    navigate({
      to: "/messages",
      search: { peer: member.id } as never,
    });
  }

  return (
    <Shell>
      <PageTitle kicker="Réseau">Membres et connexions</PageTitle>

      <Panel tone="deep" className="mb-5">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-umber-soft" />
          <input
            className="w-full bg-transparent text-[15px] outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un membre ou une connexion"
          />
        </div>
        {networkStatus && <p className="mt-3 text-[13px] text-clay">{networkStatus}</p>}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <SectionHeader icon={Users} title="Demandes reçues" />
          <div className="space-y-3">
            {loading ? (
              <Empty titre="Chargement" texte="Vérification de vos demandes de connexion." />
            ) : received.length ? (
              received.map((member) => (
                <RemoteMemberRow
                  key={member.id}
                  member={member}
                  onSelect={() => setSelected(member)}
                >
                  <Btn
                    onClick={async () => {
                      if (!member.requestId) return;
                      await answerRemoteConnection(member.requestId, "accepted");
                      await refreshNetwork();
                    }}
                  >
                    Accepter
                  </Btn>
                  <Btn
                    variant="quiet"
                    onClick={async () => {
                      if (!member.requestId) return;
                      await answerRemoteConnection(member.requestId, "rejected");
                      await refreshNetwork();
                    }}
                  >
                    Refuser
                  </Btn>
                </RemoteMemberRow>
              ))
            ) : (
              <Empty titre="Aucune demande" texte="Les nouvelles invitations apparaîtront ici." />
            )}
          </div>
        </Panel>

        <Panel tone="deep">
          <SectionHeader icon={Shield} title="Suggestions" />
          <p className="mb-4 text-[13px] leading-relaxed text-umber-soft">
            Retrouvez les membres disponibles et envoyez une demande de connexion.
          </p>
          <div className="space-y-3">
            {loading ? (
              <Empty titre="Chargement" texte="Recherche des membres disponibles." />
            ) : suggestions.length ? (
              suggestions.slice(0, 12).map((member) => (
                <RemoteMemberRow
                  key={member.id}
                  member={member}
                  onSelect={() => setSelected(member)}
                >
                  {member.status === "pending" ? (
                    <span className="label-mono text-clay">Demande envoyée</span>
                  ) : (
                    <Btn
                      variant="outline"
                      onClick={async () => {
                        await sendRemoteConnection(member.id);
                        await refreshNetwork();
                      }}
                    >
                      Ajouter
                    </Btn>
                  )}
                </RemoteMemberRow>
              ))
            ) : (
              <Empty titre="Aucune suggestion" texte="Les membres disponibles apparaîtront ici." />
            )}
          </div>
        </Panel>
      </div>

      <Panel tone="forest" className="mt-5">
        <Kicker className="text-brass">Connexions actuelles</Kicker>
        <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {accepted.length ? (
            accepted.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 bg-ivory/10 p-3 transition-colors hover:bg-ivory/15"
              >
                <button
                  type="button"
                  onClick={() => setSelected(member)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <Monogram name={member.pseudo} imageUrl={member.avatarUrl} size={38} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold">
                      {member.pseudo}
                    </span>
                    <span className="label-mono mt-1 block truncate text-ivory/60">
                      {member.signe}
                    </span>
                  </span>
                </button>
                <Btn
                  variant="outline"
                  className="shrink-0 border-ivory/25 px-3 text-ivory hover:bg-ivory/10"
                  onClick={() => openConversation(member)}
                >
                  Écrire
                </Btn>
                {member.requestId && (
                  <button
                    type="button"
                    onClick={async () => {
                      setNetworkStatus("Retrait de la connexion...");
                      try {
                        await removeRemoteConnection(member.requestId!);
                        await refreshNetwork();
                        setNetworkStatus("Connexion retirée.");
                      } catch {
                        setNetworkStatus("Impossible de retirer cette connexion pour le moment.");
                      }
                    }}
                    className="grid size-9 shrink-0 place-items-center text-ivory/65 transition-colors hover:text-brass"
                    aria-label="Retirer cette connexion"
                  >
                    <UserMinus className="size-4" />
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-[13px] text-ivory/70">Vos connexions acceptées apparaîtront ici.</p>
          )}
        </div>
      </Panel>

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
    select: (state) => state.location.search as { conversation?: string; peer?: string },
  });
  const [active, setActive] = useState("");
  const [draft, setDraft] = useState("");
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

  async function refreshMessages() {
    try {
      const remote = await loadConversationsFromSupabase();
      setLocalMessages(remote ?? []);
    } catch {
      setLocalMessages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const cached = readCachedConversations(currentUserId);
    if (cached) {
      setLocalMessages(cached);
      setLoading(false);
    }
    void refreshMessages();
  }, [currentUserId]);

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

  return (
    <Shell>
      <PageTitle kicker="Messages">Conversations</PageTitle>
      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[300px_1fr]">
        <Panel className={cn("space-y-2", active && "hidden lg:block")}>
          {loading ? (
            <Empty titre="Chargement" texte="Ouverture de vos conversations." />
          ) : localMessages.length ? (
            localMessages.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setPendingPeer(null);
                  setMessageStatus("");
                  setActive(item.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 p-3 text-left transition-colors",
                  active === item.id ? "bg-umber text-ivory" : "hover:bg-ivory-deep",
                )}
              >
                <Monogram name={item.pseudo} imageUrl={item.avatarUrl} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{item.pseudo}</span>
                  <span
                    className={cn(
                      "block truncate text-[12px]",
                      active === item.id ? "text-ivory/60" : "text-umber-soft",
                    )}
                  >
                    {item.extrait}
                  </span>
                </span>
                {item.nonLus > 0 && (
                  <span className="grid size-5 place-items-center rounded-full bg-clay font-mono text-[9px] text-ivory">
                    {item.nonLus}
                  </span>
                )}
              </button>
            ))
          ) : (
            <Empty titre="Aucune conversation" texte="Écrivez à une connexion depuis le réseau." />
          )}
        </Panel>

        {currentConversation ? (
          <Panel tone="deep" className="flex flex-col">
            <div className="mb-4 flex items-center gap-3 border-b border-umber/10 pb-4">
              <button
                type="button"
                onClick={() => setActive("")}
                className="grid size-9 shrink-0 place-items-center text-umber-soft lg:hidden"
                aria-label="Retour aux conversations"
              >
                <ChevronLeft className="size-5" />
              </button>
              <Monogram
                name={currentConversation.pseudo}
                imageUrl={currentConversation.avatarUrl}
                size={42}
              />
              <div>
                <p className="font-semibold">{currentConversation.pseudo}</p>
                <p className="label-mono text-umber-soft">Conversation</p>
              </div>
            </div>
            {messageStatus && <p className="mb-3 text-[13px] text-clay">{messageStatus}</p>}
            <div className="flex-1 space-y-3">
              {currentConversation.messages.length ? (
                currentConversation.messages.map((message, index) => (
                  <div
                    key={`${message.heure}-${index}`}
                    className={cn(
                      "max-w-[78%] p-3 text-[13px] leading-relaxed",
                      message.de === "moi" ? "ml-auto bg-forest text-ivory" : "bg-card carved",
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
                if (!draft.trim()) return;
                setMessageStatus("");
                let targetConversationId = currentConversation.id;
                if (targetConversationId.startsWith("peer:")) {
                  const peerId = targetConversationId.replace("peer:", "");
                  try {
                    const createdId = await findOrCreateConversation(peerId);
                    if (!createdId) {
                      setMessageStatus("Conversation indisponible pour le moment.");
                      return;
                    }
                    targetConversationId = createdId;
                    setActive(createdId);
                    setPendingPeer(null);
                  } catch {
                    setMessageStatus("Impossible de créer cette conversation pour le moment.");
                    return;
                  }
                }
                setLocalMessages((items) =>
                  items.some((item) => item.id === targetConversationId)
                    ? items.map((item) =>
                        item.id === targetConversationId
                          ? {
                              ...item,
                              extrait: draft,
                              messages: [
                                ...item.messages,
                                {
                                  id: `local-${Date.now()}`,
                                  de: "moi",
                                  texte: draft,
                                  heure: "à l'instant",
                                },
                              ],
                            }
                          : item,
                      )
                    : [
                        ...items,
                        {
                          id: targetConversationId,
                          pseudo: currentConversation.pseudo,
                          avatarUrl: currentConversation.avatarUrl,
                          extrait: draft,
                          heure: "à l'instant",
                          nonLus: 0,
                          messages: [
                            {
                              id: `local-${Date.now()}`,
                              de: "moi",
                              texte: draft,
                              heure: "à l'instant",
                            },
                          ],
                        },
                      ],
                );
                void sendRemoteMessage(targetConversationId, draft)
                  .then(refreshMessages)
                  .catch(() => {
                    setMessageStatus("Le message n'a pas pu être envoyé. Réessayez.");
                    void refreshMessages();
                  });
                setDraft("");
              }}
              className="mt-5 flex gap-2"
            >
              <input
                className={inputCls}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Écrire un message…"
              />
              <Btn type="submit">
                <Send className="size-3.5" /> Envoyer
              </Btn>
            </form>
          </Panel>
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
        <div className="h-40 bg-[url('/src/assets/cover.jpg')] bg-cover bg-center opacity-90" />
        <div className="relative z-10 -mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative z-20 rounded-full border-4 border-forest bg-forest">
              <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={82} tone="clay" />
            </div>
            <div>
              <h1 className="font-display text-[38px] uppercase leading-none">{profil.pseudo}</h1>
              <p className="mt-2 text-[13px] text-ivory/70">
                {connectionCount} connexions ·{" "}
                {profil.initie
                  ? `${profil.signe} · initié en ${profil.annee}`
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
      {tab !== "publications" && (
        <Panel>
          <Kicker>{tab}</Kicker>
          <p className="mt-3 text-[14px] leading-relaxed text-umber-soft">{profil.temoignage}</p>
        </Panel>
      )}
    </Shell>
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
              index === 0 ? "bg-forest text-ivory" : "bg-card carved",
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Kicker className={index === 0 ? "text-brass" : undefined}>
              Service {String(index + 1).padStart(2, "0")}
            </Kicker>
            <h2 className="mt-3 font-display text-[28px] uppercase leading-none">
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
  const copy = serviceCopy[slug] ?? serviceCopy.consultation;
  const formules =
    slug === "etude"
      ? formulesEtude
      : slug === "accompagnement"
        ? formulesAccompagnement
        : formulesConsultation;
  const [selectedFormula, setSelectedFormula] = useState(formules[0]?.nom ?? "");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject.trim()) {
      setStatus("Indiquez l'objet de votre demande.");
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
      });
      setSubject("");
      setDeadline("");
      setDetails("");
      setStatus(`Demande enregistrée. Référence ${reference.slice(0, 8).toUpperCase()}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "La demande n'a pas pu être enregistrée.");
    } finally {
      setSubmitting(false);
    }
  }

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
      <div className="grid gap-4 md:grid-cols-3">
        {formules.map((formule) => (
          <button
            key={formule.nom}
            type="button"
            onClick={() => setSelectedFormula(formule.nom)}
            className="text-left"
          >
            <Panel
              tone={selectedFormula === formule.nom || formule.recommande ? "forest" : "paper"}
              className={cn(
                "h-full transition-transform hover:-translate-y-0.5",
                selectedFormula === formule.nom && "ring-2 ring-clay/40",
              )}
            >
              <Kicker className={formule.recommande ? "text-brass" : undefined}>
                {formule.recommande ? "Recommandé" : "Formule"}
              </Kicker>
              <h2 className="mt-3 font-display text-[25px] uppercase leading-none">
                {formule.nom}
              </h2>
              <p
                className={cn(
                  "mt-3 text-[13px]",
                  formule.recommande ? "text-ivory/75" : "text-umber-soft",
                )}
              >
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
            <Btn type="submit" className="mt-1" disabled={submitting}>
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
  const signe = signes.find((item) => item.slug === slug) ?? signes[0];
  return (
    <Shell>
      <PageTitle
        kicker={signe.numero}
        action={
          <Btn to="/fa" variant="ghost">
            Retour
          </Btn>
        }
      >
        {signe.nom}
      </PageTitle>
      <Panel tone="forest" className="mb-5">
        <p className="font-display text-[28px] uppercase leading-none">{signe.soustitre}</p>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ivory/75">
          {signe.presentation}
        </p>
      </Panel>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Panel>
          <Kicker>Signification</Kicker>
          <p className="mt-3 text-[14px] leading-relaxed text-umber-soft">{signe.signification}</p>
          <ListBlock title="Enseignements" items={signe.enseignements} />
          <ListBlock title="Interdits rapportés" items={signe.interdits} />
          <ListBlock title="Recommandations" items={signe.recommandations} />
        </Panel>
        <div className="space-y-4">
          <Panel tone="deep">
            <Kicker>Correspondances</Kicker>
            <div className="mt-3 space-y-2">
              {signe.correspondances.map((item) => (
                <div
                  key={item.cle}
                  className="flex justify-between border-b border-umber/10 py-2 text-[13px]"
                >
                  <span className="text-umber-soft">{item.cle}</span>
                  <strong>{item.valeur}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <Kicker>Variantes</Kicker>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-umber-soft">
              {signe.variantes.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

export function RecherchePage() {
  const [q, setQ] = useState("");
  const [network, setNetwork] = useState<Awaited<
    ReturnType<typeof loadNetworkFromSupabase>
  > | null>(null);

  useEffect(() => {
    loadNetworkFromSupabase()
      .then((items) => setNetwork(items))
      .catch(() => setNetwork(null));
  }, []);

  const results = useMemo(() => {
    const query = q.toLowerCase();
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
      ...signes.map((s) => ({ title: s.nom, text: s.soustitre, to: `/fa/${s.slug}` })),
      ...remoteMembers,
      ...mockServices.map((s) => ({
        title: s.titre,
        text: s.description,
        to: `/services/${s.slug}`,
      })),
    ].filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(query));
  }, [network, q]);
  return (
    <Shell>
      <PageTitle kicker="Recherche">Trouver rapidement</PageTitle>
      <Panel tone="deep" className="mb-5">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-umber-soft" />
          <input
            className="w-full bg-transparent text-[15px] outline-none"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Signe, membre, service…"
          />
        </div>
      </Panel>
      <div className="space-y-3">
        {(q.trim() ? results : results.slice(0, 8)).map((item) => (
          <Link
            key={`${item.to}-${item.title}`}
            to={item.to as never}
            className="block bg-card carved p-4 transition-colors hover:bg-ivory-deep/40"
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-[13px] text-umber-soft">{item.text}</p>
          </Link>
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
            <input
              className={inputCls}
              placeholder="Ex. Gbé Mêdji"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
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

export function DossierPage() {
  const { profil, currentUserId } = useApp();
  const [requests, setRequests] = useState<ServiceRequest[]>(() =>
    readCachedServiceRequests(currentUserId),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedServiceRequests(currentUserId);
    if (cached.length) {
      setRequests(cached);
      setLoading(false);
    }
    let active = true;
    loadMyServiceRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUserId]);

  return (
    <Shell>
      <PageTitle kicker="Dossier Fa personnel">Votre espace privé</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          ["Signe Fa", profil.signe],
          ["Demandes", loading ? "Chargement..." : `${requests.length} dossier(s)`],
          [
            "Dernière demande",
            requests[0]
              ? `${serviceRequestLabels[requests[0].serviceType] ?? requests[0].serviceType} · ${
                  serviceStatusLabels[requests[0].status] ?? requests[0].status
                }`
              : "Aucune demande enregistrée",
          ],
          ["Documents", "Les pièces liées aux dossiers apparaîtront ici."],
        ].map(([item, value]) => (
          <Panel key={item}>
            <Kicker>{item}</Kicker>
            <p className="mt-3 text-[14px] text-umber-soft">{value}</p>
          </Panel>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {requests.map((request) => (
          <Panel key={request.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Kicker>{formatShortDate(request.createdAt)}</Kicker>
                <h2 className="mt-2 font-display text-[22px] uppercase leading-none">
                  {request.subject}
                </h2>
                <p className="mt-2 text-[13px] text-umber-soft">
                  {serviceRequestLabels[request.serviceType] ?? request.serviceType}
                  {request.formulaName ? ` · ${request.formulaName}` : ""}
                </p>
              </div>
              <Chip>{serviceStatusLabels[request.status] ?? request.status}</Chip>
            </div>
          </Panel>
        ))}
      </div>
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
      date: formatShortDate(item.createdAt),
      titre: item.subject,
      texte: `${serviceRequestLabels[item.serviceType] ?? item.serviceType} · ${
        serviceStatusLabels[item.status] ?? item.status
      }`,
    })),
    ...contributions.map((item) => ({
      id: `contribution-${item.id}`,
      date: formatShortDate(item.createdAt),
      titre: item.title,
      texte: `${item.categoryLabel} · ${item.status}`,
    })),
  ];

  return (
    <Shell>
      <PageTitle kicker="Carnet de parcours">Historique personnel</PageTitle>
      <div className="space-y-4">
        {entries.map((item) => (
          <Panel key={item.id}>
            <Kicker>{item.date}</Kicker>
            <h2 className="mt-2 font-display text-[23px] uppercase leading-none">{item.titre}</h2>
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
  const { notifications, currentUserId } = useApp();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const cached = readCachedNotifications(currentUserId);
    if (cached) actions.remplacerNotifications(cached);
    loadNotificationsFromSupabase()
      .then((items) => {
        if (items) actions.remplacerNotifications(items);
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            to={destination[notification.type] as any}
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

export function ParametresPage() {
  const { profil } = useApp();
  const [pseudo, setPseudo] = useState(profil.pseudo);
  const [relation, setRelation] = useState(profil.miseEnRelation);
  const [avatarUrl, setAvatarUrl] = useState(profil.avatarUrl ?? "");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPseudo(profil.pseudo);
    setRelation(profil.miseEnRelation);
    setAvatarUrl(profil.avatarUrl ?? "");
  }, [profil.avatarUrl, profil.miseEnRelation, profil.pseudo]);

  async function chooseProfileImage(file: File | undefined) {
    if (!file) return;
    setStatus("Enregistrement de la photo...");
    const nextAvatar = await uploadProfileAvatar(file);
    setAvatarUrl(nextAvatar);
    actions.majProfil({ avatarUrl: nextAvatar });
    try {
      await updateProfileSettings({ pseudo, miseEnRelation: relation, avatarUrl: nextAvatar });
      const savedProfile = await loadCurrentProfile();
      if (savedProfile) actions.majProfil(savedProfile);
      setStatus("Photo de profil enregistrée.");
    } catch {
      setStatus("Photo ajoutée sur cet appareil. Réessayez l'enregistrement si nécessaire.");
    }
  }

  async function save() {
    setStatus("");
    const patch = { pseudo, miseEnRelation: relation, avatarUrl };
    actions.majProfil(patch);
    try {
      await updateProfileSettings({ pseudo, miseEnRelation: relation, avatarUrl });
      const savedProfile = await loadCurrentProfile();
      if (savedProfile) actions.majProfil(savedProfile);
      setStatus("Profil enregistré.");
    } catch {
      setStatus(
        "Profil enregistré sur cet appareil. La sauvegarde distante sera réessayée plus tard.",
      );
    }
  }

  return (
    <Shell>
      <PageTitle kicker="Confidentialité">Réglages du profil</PageTitle>
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pseudonyme">
            <input
              className={inputCls}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
            />
          </Field>
          <Field label="Visibilité du signe">
            <select className={inputCls}>
              <option>Membres du même signe</option>
              <option>Connexions uniquement</option>
              <option>Moi uniquement</option>
            </select>
          </Field>
          <Field label="Photo de profil">
            <div className="flex items-center gap-3">
              <Monogram name={pseudo} imageUrl={avatarUrl} size={54} />
              <input
                className={inputCls}
                type="file"
                accept="image/*"
                onChange={(e) => void chooseProfileImage(e.target.files?.[0])}
              />
            </div>
          </Field>
          <Field label="Photo de couverture">
            <div className="aspect-[5/2] w-full bg-[url('/src/assets/cover.jpg')] bg-cover bg-center" />
            <p className="mt-2 text-[12px] text-umber-soft">
              La couverture Ifawa est commune à tous les profils.
            </p>
          </Field>
        </div>
        <button
          onClick={() => setRelation((value) => !value)}
          className="mt-5 flex w-full items-center justify-between bg-ivory-deep p-4 text-left"
        >
          <span>
            <strong>Mise en relation</strong>
            <span className="mt-1 block text-[13px] text-umber-soft">
              Recevoir des demandes de connexion.
            </span>
          </span>
          <span className={cn("label-mono", relation ? "text-clay" : "text-umber-soft")}>
            {relation ? "Activée" : "Désactivée"}
          </span>
        </button>
        <Btn className="mt-4" onClick={save}>
          Enregistrer
        </Btn>
        {status && <p className="mt-3 text-[13px] text-umber-soft">{status}</p>}
      </Panel>
    </Shell>
  );
}

export function SuiviPage() {
  const { currentUserId } = useApp();
  const [requests, setRequests] = useState<ServiceRequest[]>(() =>
    readCachedServiceRequests(currentUserId),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCachedServiceRequests(currentUserId);
    if (cached.length) {
      setRequests(cached);
      setLoading(false);
    }
    let active = true;
    loadMyServiceRequests()
      .then((items) => {
        if (active) setRequests(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [currentUserId]);

  const current = requests[0];

  return (
    <Shell>
      <PageTitle kicker="Suivi">Consultation en cours</PageTitle>
      {current ? (
        <>
          <Panel tone="forest" className="mb-5">
            <p className="font-display text-[28px] uppercase leading-none">
              {current.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-2 text-[13px] text-ivory/70">
              {serviceRequestLabels[current.serviceType] ?? current.serviceType} ·{" "}
              {serviceStatusLabels[current.status] ?? current.status}
            </p>
          </Panel>
          <div className="space-y-3">
            {[
              ["Demande reçue", formatShortDate(current.createdAt), true],
              [
                "Analyse du dossier",
                "Après lecture par l'équipe Ifawa",
                current.status !== "submitted",
              ],
              [
                "Réponse transmise",
                "Lorsque le traitement est terminé",
                current.status === "completed",
              ],
            ].map(([step, date, done], index) => (
              <Panel key={String(step)} tone={index === 0 ? "deep" : "paper"}>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-8 place-items-center rounded-full",
                      done ? "bg-clay text-ivory" : "bg-ivory-deep text-umber-soft",
                    )}
                  >
                    {done ? <Check className="size-4" /> : "•"}
                  </span>
                  <div>
                    <p className="font-semibold">{step}</p>
                    <p className="label-mono text-umber-soft">{date}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </>
      ) : (
        <Empty
          titre={loading ? "Chargement du suivi" : "Aucune demande en cours"}
          texte={
            loading
              ? "Vos dossiers sont en cours de récupération."
              : "Envoyez une demande depuis les services pour ouvrir un suivi."
          }
        />
      )}
    </Shell>
  );
}

export function AccompagnementPage() {
  return (
    <Shell>
      <PageTitle kicker="Mon accompagnement">Suivi personnel</PageTitle>
      <Panel tone="forest" className="mb-5">
        <p className="font-display text-[30px] uppercase leading-none">Formule 6 mois</p>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ivory/75">
          Suivi actif, questions incluses et compte rendu mensuel.
        </p>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        {["15 questions incluses", "2 comptes rendus mensuels", "1 étude de signe offerte"].map(
          (item) => (
            <Panel key={item}>
              <Kicker>Inclus</Kicker>
              <p className="mt-2 font-semibold">{item}</p>
            </Panel>
          ),
        )}
      </div>
    </Shell>
  );
}

export function AdminPage() {
  return (
    <Shell>
      <PageTitle kicker="Administration">Pilotage interne</PageTitle>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat title="Consultations" value={String(consultationsAdmin.length)} />
        <Stat title="Contributions" value={String(contributionsAdmin.length)} />
        <Stat title="Partenaires" value={String(partenaires.length)} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AdminList
          title="Consultations en cours"
          rows={consultationsAdmin.map((item) => `${item.ref} · ${item.user} · ${item.statut}`)}
        />
        <AdminList
          title="Contributions en attente"
          rows={contributionsAdmin.map((item) => `${item.id} · ${item.membre} · ${item.statut}`)}
        />
      </div>
    </Shell>
  );
}

export function RapportPage() {
  return (
    <Shell>
      <PageTitle kicker="Rapport multi-praticiens">Synthèse comparative</PageTitle>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1fr]">
        <div className="space-y-4">
          {avisPraticiens.map((avis) => (
            <Panel key={avis.ref}>
              <Kicker>{avis.ref}</Kicker>
              <h2 className="mt-2 font-semibold">{avis.titre}</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-umber-soft">{avis.texte}</p>
            </Panel>
          ))}
        </div>
        <Panel tone="deep">
          <SectionHeader icon={BookOpen} title="Synthèse" />
          {syntheseRapport.map((bloc) => (
            <ListBlock key={bloc.titre} title={bloc.titre} items={bloc.items} />
          ))}
        </Panel>
      </div>
    </Shell>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Users; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon className="size-4 text-clay" />
      <h2 className="font-display text-[22px] uppercase leading-none">{title}</h2>
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
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 bg-ivory-deep/45 p-3 sm:flex-row sm:flex-wrap sm:items-center",
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
    <div className="flex flex-col gap-3 bg-ivory-deep/45 p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 items-center gap-3 text-left"
      >
        <Monogram name={member.pseudo} imageUrl={member.avatarUrl} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{member.pseudo}</p>
          <p className="label-mono mt-1 whitespace-normal leading-relaxed text-umber-soft">
            {member.signe}
          </p>
        </div>
      </button>
      <div className="flex flex-wrap gap-2 sm:ml-auto">{children}</div>
    </div>
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
        <div className="h-32 bg-[url('/src/assets/cover.jpg')] bg-cover bg-center" />
        <div className="-mt-10 px-5 pb-5">
          <div className="relative z-10 inline-flex rounded-full border-4 border-card bg-card">
            <Monogram name={member.pseudo} imageUrl={member.avatarUrl} size={76} tone="clay" />
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-[34px] uppercase leading-none">{member.pseudo}</h2>
              <p className="label-mono mt-2 text-umber-soft">{member.signe}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-umber-soft hover:text-clay"
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

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5">
      <Kicker>{title}</Kicker>
      <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-umber-soft">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Panel tone="deep">
      <Kicker>{title}</Kicker>
      <p className="mt-3 font-display text-[38px] uppercase leading-none">{value}</p>
    </Panel>
  );
}

function AdminList({ title, rows }: { title: string; rows: string[] }) {
  return (
    <Panel>
      <Kicker>{title}</Kicker>
      <div className="mt-3 space-y-2">
        {rows.map((row) => (
          <p key={row} className="bg-ivory-deep/50 p-3 text-[13px]">
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
