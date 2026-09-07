import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
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
  Users,
} from "lucide-react";
import {
  avisPraticiens,
  carnet,
  consultationsAdmin,
  contributionsAdmin,
  conversations,
  demandesConnexion,
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
import { fetchServiceCatalog, type ServiceCard } from "@/lib/ifawa-services";
import { updateProfileMedia } from "@/lib/ifawa-auth";
import { Btn, Chip, Empty, Field, Kicker, Monogram, PageTitle, Panel, inputCls } from "./primitives";
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

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ReseauPage() {
  const { demandes, demandesEnvoyees, connexions, profil } = useApp();
  const connexionsActuelles = membres.filter((m) => connexions.includes(m.id));
  const suggestions = membres.filter((m) => !connexions.includes(m.id));

  return (
    <Shell>
      <PageTitle kicker="Réseau">Membres et connexions</PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <SectionHeader icon={Users} title="Demandes reçues" />
          <div className="space-y-3">
            {demandesConnexion.map((demande) => {
              const etat = demandes.find((d) => d.id === demande.id)?.etat ?? "attente";
              return (
                <MemberRow key={demande.id} name={demande.pseudo} meta={`${demande.motif} · ${demande.signe}`} active={etat === "acceptee"}>
                  {etat === "attente" ? (
                    <div className="flex gap-2">
                      <Btn onClick={() => actions.repondreDemande(demande.id, "acceptee")}>Accepter</Btn>
                      <Btn variant="quiet" onClick={() => actions.repondreDemande(demande.id, "refusee")}>Refuser</Btn>
                    </div>
                  ) : (
                    <span className="label-mono text-clay">{etat === "acceptee" ? "Acceptée" : "Refusée"}</span>
                  )}
                </MemberRow>
              );
            })}
          </div>
        </Panel>

        <Panel tone="deep">
          <SectionHeader icon={Shield} title="Même signe que vous" />
          <p className="mb-4 text-[13px] leading-relaxed text-umber-soft">
            Votre signe actuel : {profil.signe}. Les demandes restent encadrées par vos réglages de confidentialité.
          </p>
          <div className="space-y-3">
            {suggestions.slice(0, 5).map((membre) => (
              <MemberRow key={membre.id} name={membre.pseudo} meta={`${membre.signe} · ${membre.connexions} connexions`}>
                {demandesEnvoyees.includes(membre.id) ? (
                  <span className="label-mono text-clay">Demande envoyée</span>
                ) : (
                  <Btn variant="outline" onClick={() => actions.envoyerDemande(membre.id)}>Ajouter</Btn>
                )}
              </MemberRow>
            ))}
          </div>
        </Panel>
      </div>

      <Panel tone="forest" className="mt-5">
        <Kicker className="text-brass">Connexions actuelles</Kicker>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {connexionsActuelles.map((membre) => (
            <Link key={membre.id} to="/profil" className="bg-ivory/10 p-4 transition-colors hover:bg-ivory/15">
              <Monogram name={membre.pseudo} size={38} />
              <p className="mt-3 font-semibold">{membre.pseudo}</p>
              <p className="label-mono mt-1 text-ivory/60">{membre.signe}</p>
            </Link>
          ))}
        </div>
      </Panel>
    </Shell>
  );
}

export function MessagesPage() {
  const [active, setActive] = useState("");
  const [draft, setDraft] = useState("");
  const [localMessages, setLocalMessages] = useState(conversations);
  const conversation = localMessages.find((c) => c.id === active);

  return (
    <Shell>
      <PageTitle kicker="Messages">Conversations</PageTitle>
      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[300px_1fr]">
        <Panel className={cn("space-y-2", active && "hidden lg:block")}>
          {localMessages.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn("flex w-full items-center gap-3 p-3 text-left transition-colors", active === item.id ? "bg-umber text-ivory" : "hover:bg-ivory-deep")}
            >
              <Monogram name={item.pseudo} size={38} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{item.pseudo}</span>
                <span className={cn("block truncate text-[12px]", active === item.id ? "text-ivory/60" : "text-umber-soft")}>{item.extrait}</span>
              </span>
              {item.nonLus > 0 && <span className="grid size-5 place-items-center rounded-full bg-clay font-mono text-[9px] text-ivory">{item.nonLus}</span>}
            </button>
          ))}
        </Panel>

        {conversation ? (
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
              <Monogram name={conversation.pseudo} size={42} />
              <div>
                <p className="font-semibold">{conversation.pseudo}</p>
                <p className="label-mono text-umber-soft">Conversation</p>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {conversation.messages.map((message, index) => (
                <div key={`${message.heure}-${index}`} className={cn("max-w-[78%] p-3 text-[13px] leading-relaxed", message.de === "moi" ? "ml-auto bg-forest text-ivory" : "bg-card carved")}>
                  {message.texte}
                  <span className={cn("label-mono mt-1 block", message.de === "moi" ? "text-ivory/55" : "text-umber-soft/70")}>{message.heure}</span>
                </div>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!draft.trim()) return;
                setLocalMessages((items) =>
                  items.map((item) =>
                    item.id === conversation.id
                      ? { ...item, extrait: draft, messages: [...item.messages, { de: "moi", texte: draft, heure: "à l'instant" }] }
                      : item,
                  ),
                );
                setDraft("");
              }}
              className="mt-5 flex gap-2"
            >
              <input className={inputCls} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Écrire un message…" />
              <Btn type="submit"><Send className="size-3.5" /> Envoyer</Btn>
            </form>
          </Panel>
        ) : (
          <Panel tone="deep" className="hidden items-center justify-center lg:flex">
            <Empty titre="Sélectionnez une conversation" texte="Choisissez un échange dans la liste pour lire et répondre." />
          </Panel>
        )}
      </div>
    </Shell>
  );
}

export function ProfilPage() {
  const { profil, posts, connexions } = useApp();
  const [tab, setTab] = useState("publications");
  const ownPosts = posts.filter((post) => post.auteur === profil.pseudo);

  return (
    <Shell>
      <Panel tone="forest" className="relative mb-5 overflow-hidden p-0">
        <div
          className="h-40 bg-[url('/src/assets/cover.jpg')] bg-cover bg-center opacity-90"
          style={profil.coverUrl ? { backgroundImage: `url(${profil.coverUrl})` } : undefined}
        />
        <div className="relative z-10 -mt-10 flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative z-20 rounded-full border-4 border-forest bg-forest">
              <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={82} tone="clay" />
            </div>
            <div>
              <h1 className="font-display text-[38px] uppercase leading-none">{profil.pseudo}</h1>
              <p className="mt-2 text-[13px] text-ivory/70">
                {connexions.length} connexions · {profil.initie ? `${profil.signe} · initié en ${profil.annee}` : "Espace découverte"}
              </p>
            </div>
          </div>
          <Btn to="/parametres" variant="outline" className="border-ivory/25 text-ivory hover:bg-ivory/10">Modifier</Btn>
        </div>
      </Panel>

      <div className="mb-5 flex gap-2 overflow-x-auto">
        {["publications", "à propos", "connexions", "contributions", "parcours"].map((item) => (
          <Chip key={item} active={tab === item} onClick={() => setTab(item)}>{item}</Chip>
        ))}
      </div>

      {tab === "publications" && (
        <>
          <Panel tone="deep" className="mb-4">
            <div className="flex items-start gap-3">
              <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={40} />
              <div className="flex-1">
                <p className="text-[14px] text-umber-soft">Publiez une pensée, une question ou une contribution depuis le fil.</p>
                <Btn to="/accueil" className="mt-3">Publier depuis le fil</Btn>
              </div>
            </div>
          </Panel>
          {ownPosts.length ? ownPosts.map((post, index) => <PostCard key={post.id} post={post} index={index} />) : <Empty titre="Aucune publication personnelle" texte="Vos publications apparaîtront ici." />}
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
  const [catalog, setCatalog] = useState<ServiceCard[]>(mockServices);

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
            className={cn("animate-rise p-5 transition-transform hover:-translate-y-0.5", index === 0 ? "bg-forest text-ivory" : "bg-card carved")}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <Kicker className={index === 0 ? "text-brass" : undefined}>Service {String(index + 1).padStart(2, "0")}</Kicker>
            <h2 className="mt-3 font-display text-[28px] uppercase leading-none">{service.titre}</h2>
            <p className={cn("mt-3 text-[13px] leading-relaxed", index === 0 ? "text-ivory/75" : "text-umber-soft")}>{service.description}</p>
            <span className={cn("label-mono mt-5 block", index === 0 ? "text-brass" : "text-clay")}>Ouvrir →</span>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

export function ServiceDetailPage({ slug }: { slug: string }) {
  const copy = serviceCopy[slug] ?? serviceCopy.consultation;
  const formules = slug === "etude" ? formulesEtude : slug === "accompagnement" ? formulesAccompagnement : formulesConsultation;
  const [sent, setSent] = useState(false);

  return (
    <Shell>
      <PageTitle kicker={copy.kicker} action={<Btn to="/services" variant="ghost">Services</Btn>}>{copy.title}</PageTitle>
      <Panel tone="deep" className="mb-5">
        <p className="max-w-2xl text-[14px] leading-relaxed text-umber-soft">{copy.intro}</p>
      </Panel>
      <div className="grid gap-4 md:grid-cols-3">
        {formules.map((formule) => (
          <Panel key={formule.nom} tone={formule.recommande ? "forest" : "paper"}>
            <Kicker className={formule.recommande ? "text-brass" : undefined}>{formule.recommande ? "Recommandé" : "Formule"}</Kicker>
            <h2 className="mt-3 font-display text-[25px] uppercase leading-none">{formule.nom}</h2>
            <p className={cn("mt-3 text-[13px]", formule.recommande ? "text-ivory/75" : "text-umber-soft")}>{"delai" in formule ? formule.delai : formule.suivi}</p>
            <p className="mt-4 font-semibold">{formule.prix}</p>
          </Panel>
        ))}
      </div>
      <Panel className="mt-5">
        <SectionHeader icon={FileText} title="Créer la demande" />
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
          className="grid gap-3 sm:grid-cols-2"
        >
          <Field label="Objet"><input className={inputCls} placeholder="Votre préoccupation" /></Field>
          <Field label="Délai"><input className={inputCls} placeholder="Standard, prioritaire…" /></Field>
          <Field label="Détails"><textarea className={cn(inputCls, "min-h-28 sm:col-span-2")} placeholder="Décrivez la demande…" /></Field>
          <div className="sm:col-span-2">
            <Btn type="submit" className="mt-1">Envoyer la demande</Btn>
            {sent && <p className="mt-3 text-[13px] text-umber-soft">Votre demande est enregistrée dans le suivi.</p>}
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
      <PageTitle kicker={signe.numero} action={<Btn to="/fa" variant="ghost">Retour</Btn>}>{signe.nom}</PageTitle>
      <Panel tone="forest" className="mb-5">
        <p className="font-display text-[28px] uppercase leading-none">{signe.soustitre}</p>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ivory/75">{signe.presentation}</p>
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
                <div key={item.cle} className="flex justify-between border-b border-umber/10 py-2 text-[13px]">
                  <span className="text-umber-soft">{item.cle}</span>
                  <strong>{item.valeur}</strong>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <Kicker>Variantes</Kicker>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-umber-soft">
              {signe.variantes.map((item) => <li key={item}>• {item}</li>)}
            </ul>
          </Panel>
        </div>
      </div>
    </Shell>
  );
}

export function RecherchePage() {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const query = q.toLowerCase();
    return [
      ...signes.map((s) => ({ title: s.nom, text: s.soustitre, to: `/fa/${s.slug}` })),
      ...membres.map((m) => ({ title: m.pseudo, text: `${m.signe} · ${m.connexions} connexions`, to: "/reseau" })),
      ...mockServices.map((s) => ({ title: s.titre, text: s.description, to: `/services/${s.slug}` })),
    ].filter((item) => `${item.title} ${item.text}`.toLowerCase().includes(query));
  }, [q]);
  return (
    <Shell>
      <PageTitle kicker="Recherche">Trouver rapidement</PageTitle>
      <Panel tone="deep" className="mb-5">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-umber-soft" />
          <input className="w-full bg-transparent text-[15px] outline-none" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Signe, membre, service…" />
        </div>
      </Panel>
      <div className="space-y-3">
        {(q.trim() ? results : results.slice(0, 8)).map((item) => (
          <Link key={`${item.to}-${item.title}`} to={item.to as never} className="block bg-card carved p-4 transition-colors hover:bg-ivory-deep/40">
            <p className="font-semibold">{item.title}</p>
            <p className="mt-1 text-[13px] text-umber-soft">{item.text}</p>
          </Link>
        ))}
      </div>
    </Shell>
  );
}

export function ContribuerPage() {
  const [sent, setSent] = useState(false);
  return (
    <Shell>
      <PageTitle kicker="Contribution">Proposer à la bibliothèque</PageTitle>
      <Panel>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field label="Signe concerné"><input className={inputCls} placeholder="Ex. Gbé Mêdji" /></Field>
          <Field label="Catégorie"><input className={inputCls} placeholder="Enseignement, variante, interdit…" /></Field>
          <Field label="Contribution"><textarea className={cn(inputCls, "min-h-36 sm:col-span-2")} placeholder="Décrivez l'information à faire relire." /></Field>
          <div className="sm:col-span-2">
            <Btn type="submit" className="mt-1">Soumettre à validation</Btn>
            {sent && <p className="mt-3 text-[13px] text-umber-soft">Contribution reçue. Elle apparaît dans le circuit de validation.</p>}
          </div>
        </form>
      </Panel>
    </Shell>
  );
}

export function DossierPage() {
  const { profil } = useApp();
  return (
    <Shell>
      <PageTitle kicker="Dossier Fa personnel">Votre espace privé</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        {["Signe Fa", "Initiation", "Consultations", "Études", "Interventions", "Documents"].map((item) => (
          <Panel key={item}>
            <Kicker>{item}</Kicker>
            <p className="mt-3 text-[14px] text-umber-soft">{item === "Signe Fa" ? profil.signe : "Informations à compléter depuis votre espace."}</p>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function CarnetPage() {
  return (
    <Shell>
      <PageTitle kicker="Carnet de parcours">Historique personnel</PageTitle>
      <div className="space-y-4">
        {carnet.map((item) => (
          <Panel key={`${item.date}-${item.titre}`}>
            <Kicker>{item.date}</Kicker>
            <h2 className="mt-2 font-display text-[23px] uppercase leading-none">{item.titre}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-umber-soft">{item.texte}</p>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function NotificationsPage() {
  const { notifications } = useApp();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const shown = filter === "unread" ? notifications.filter((notification) => notification.nonLue) : notifications;
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
        action={unread > 0 && <Btn variant="ghost" onClick={actions.toutLireNotifications}>Tout lire</Btn>}
      >
        Activité récente
      </PageTitle>
      <div className="mb-5 flex gap-2 overflow-x-auto">
        <Chip active={filter === "all"} onClick={() => setFilter("all")}>Toutes</Chip>
        <Chip active={filter === "unread"} onClick={() => setFilter("unread")}>Non lues {unread > 0 ? `(${unread})` : ""}</Chip>
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
            <Panel tone={notification.nonLue ? "deep" : "paper"} className="transition-transform hover:-translate-y-0.5">
              <div className="flex items-start gap-3">
                <span className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", notification.nonLue ? "bg-clay text-ivory" : "bg-ivory-deep text-umber-soft")}>
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium">{notification.texte}</p>
                  <p className="label-mono mt-1 text-umber-soft">{notification.heure} · {notification.type}</p>
                </div>
                {notification.nonLue && <span className="mt-2 size-2 rounded-full bg-clay" aria-hidden />}
              </div>
            </Panel>
          </Link>
        ))}
        {shown.length === 0 && <Empty titre="Aucune notification" texte="Les nouvelles activités apparaîtront ici." />}
      </div>
    </Shell>
  );
}

export function ParametresPage() {
  const { profil } = useApp();
  const [pseudo, setPseudo] = useState(profil.pseudo);
  const [relation, setRelation] = useState(profil.miseEnRelation);
  const [avatarUrl, setAvatarUrl] = useState(profil.avatarUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(profil.coverUrl ?? "");
  const [status, setStatus] = useState("");

  async function chooseProfileImage(file: File | undefined) {
    if (!file) return;
    setAvatarUrl(await readFileAsDataUrl(file));
  }

  async function chooseCoverImage(file: File | undefined) {
    if (!file) return;
    setCoverUrl(await readFileAsDataUrl(file));
  }

  async function save() {
    setStatus("");
    const patch = { pseudo, miseEnRelation: relation, avatarUrl, coverUrl };
    actions.majProfil(patch);
    try {
      await updateProfileMedia({ avatarUrl, coverUrl });
      setStatus("Profil enregistré.");
    } catch {
      setStatus("Profil enregistré sur cet appareil. La sauvegarde distante sera réessayée plus tard.");
    }
  }

  return (
    <Shell>
      <PageTitle kicker="Confidentialité">Réglages du profil</PageTitle>
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pseudonyme"><input className={inputCls} value={pseudo} onChange={(e) => setPseudo(e.target.value)} /></Field>
          <Field label="Visibilité du signe"><select className={inputCls}><option>Membres du même signe</option><option>Connexions uniquement</option><option>Moi uniquement</option></select></Field>
          <Field label="Photo de profil">
            <div className="flex items-center gap-3">
              <Monogram name={pseudo} imageUrl={avatarUrl} size={54} />
              <input className={inputCls} type="file" accept="image/*" onChange={(e) => void chooseProfileImage(e.target.files?.[0])} />
            </div>
          </Field>
          <Field label="Photo de couverture">
            <div className="space-y-2">
              {coverUrl && <img src={coverUrl} alt="" className="aspect-[5/2] w-full object-cover" />}
              <input className={inputCls} type="file" accept="image/*" onChange={(e) => void chooseCoverImage(e.target.files?.[0])} />
            </div>
          </Field>
        </div>
        <button onClick={() => setRelation((value) => !value)} className="mt-5 flex w-full items-center justify-between bg-ivory-deep p-4 text-left">
          <span><strong>Mise en relation</strong><span className="mt-1 block text-[13px] text-umber-soft">Recevoir des demandes de connexion.</span></span>
          <span className={cn("label-mono", relation ? "text-clay" : "text-umber-soft")}>{relation ? "Activée" : "Désactivée"}</span>
        </button>
        <Btn className="mt-4" onClick={save}>Enregistrer</Btn>
        {status && <p className="mt-3 text-[13px] text-umber-soft">{status}</p>}
      </Panel>
    </Shell>
  );
}

export function SuiviPage() {
  return (
    <Shell>
      <PageTitle kicker="Suivi">Consultation en cours</PageTitle>
      <Panel tone="forest" className="mb-5">
        <p className="font-display text-[28px] uppercase leading-none">CS-2041</p>
        <p className="mt-2 text-[13px] text-ivory/70">Prioritaire · En traitement</p>
      </Panel>
      <div className="space-y-3">
        {timelineConsultation.map((item) => (
          <Panel key={item.etape} tone={item.actuel ? "deep" : "paper"}>
            <div className="flex items-center gap-3">
              <span className={cn("grid size-8 place-items-center rounded-full", item.fait ? "bg-clay text-ivory" : "bg-ivory-deep text-umber-soft")}>{item.fait ? <Check className="size-4" /> : "•"}</span>
              <div>
                <p className="font-semibold">{item.etape}</p>
                <p className="label-mono text-umber-soft">{item.date}</p>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </Shell>
  );
}

export function AccompagnementPage() {
  return (
    <Shell>
      <PageTitle kicker="Mon accompagnement">Suivi personnel</PageTitle>
      <Panel tone="forest" className="mb-5">
        <p className="font-display text-[30px] uppercase leading-none">Formule 6 mois</p>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-ivory/75">Suivi actif, questions incluses et compte rendu mensuel.</p>
      </Panel>
      <div className="grid gap-4 sm:grid-cols-3">
        {["15 questions incluses", "2 comptes rendus mensuels", "1 étude de signe offerte"].map((item) => (
          <Panel key={item}><Kicker>Inclus</Kicker><p className="mt-2 font-semibold">{item}</p></Panel>
        ))}
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
        <AdminList title="Consultations en cours" rows={consultationsAdmin.map((item) => `${item.ref} · ${item.user} · ${item.statut}`)} />
        <AdminList title="Contributions en attente" rows={contributionsAdmin.map((item) => `${item.id} · ${item.membre} · ${item.statut}`)} />
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
            <Panel key={avis.ref}><Kicker>{avis.ref}</Kicker><h2 className="mt-2 font-semibold">{avis.titre}</h2><p className="mt-2 text-[13px] leading-relaxed text-umber-soft">{avis.texte}</p></Panel>
          ))}
        </div>
        <Panel tone="deep">
          <SectionHeader icon={BookOpen} title="Synthèse" />
          {syntheseRapport.map((bloc) => <ListBlock key={bloc.titre} title={bloc.titre} items={bloc.items} />)}
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

function MemberRow({ name, meta, children, active }: { name: string; meta: string; children: ReactNode; active?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-3 bg-ivory-deep/45 p-3 sm:flex-row sm:flex-wrap sm:items-center", active && "outline outline-1 outline-clay/30")}>
      <div className="flex min-w-0 items-center gap-3">
        <Monogram name={name} size={38} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold">{name}</p>
          <p className="label-mono mt-1 whitespace-normal leading-relaxed text-umber-soft">{meta}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:ml-auto">
        {children}
      </div>
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-5">
      <Kicker>{title}</Kicker>
      <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-umber-soft">
        {items.map((item) => <li key={item}>• {item}</li>)}
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
        {rows.map((row) => <p key={row} className="bg-ivory-deep/50 p-3 text-[13px]">{row}</p>)}
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
