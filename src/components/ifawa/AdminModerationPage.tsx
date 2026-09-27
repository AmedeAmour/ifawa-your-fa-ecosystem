import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, FileCheck2, RotateCcw, ShieldCheck, X } from "lucide-react";
import {
  loadAdminAccess,
  loadAdminContributions,
  loadModerationEvents,
  moderateContribution,
  type AdminContribution,
  type ContributionStatus,
  type ModerationEvent,
} from "@/lib/ifawa-admin";
import { matchesSearch } from "@/lib/search-text";
import { cn } from "@/lib/utils";
import { SearchField } from "./SearchField";
import { Btn, Empty, Kicker, PageTitle, Panel, inputCls } from "./primitives";
import { Shell } from "./Shell";

const statusLabels: Record<ContributionStatus, string> = {
  submitted: "En attente",
  under_review: "En cours d’examen",
  needs_review: "Correction demandée",
  approved: "Validée",
  rejected: "Refusée",
  archived: "Archivée",
};

const actionLabels: Record<string, string> = {
  submitted: "Contribution soumise",
  resubmitted: "Contribution corrigée et renvoyée",
  review_started: "Examen commencé",
  correction_requested: "Correction demandée",
  approved: "Contribution validée",
  rejected: "Contribution refusée",
  archived: "Contribution archivée",
};

export function AdminModerationPage() {
  const [access, setAccess] = useState<"loading" | "denied" | "admin" | "moderator">("loading");
  const [items, setItems] = useState<AdminContribution[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<"all" | ContributionStatus>("submitted");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const rows = await loadAdminContributions();
    setItems(rows);
    setSelectedId((current) =>
      current && rows.some((item) => item.id === current) ? current : (rows[0]?.id ?? ""),
    );
  }

  useEffect(() => {
    let active = true;
    loadAdminAccess()
      .then(async (role) => {
        if (!active) return;
        if (!role) {
          setAccess("denied");
          return;
        }
        setAccess(role);
        await refresh();
      })
      .catch(() => {
        if (active) setError("L’espace de modération n’a pas pu être chargé.");
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (filter === "all" || item.status === filter) &&
          (!query.trim() ||
            matchesSearch(
              `${item.title} ${item.signName} ${item.authorName} ${item.category} ${item.body}`,
              query,
            )),
      ),
    [filter, items, query],
  );
  const selected = items.find((item) => item.id === selectedId);

  if (access === "loading") {
    return (
      <Shell>
        <PageTitle kicker="Gestion">Vérification des accès</PageTitle>
      </Shell>
    );
  }
  if (access === "denied") {
    return (
      <Shell>
        <Empty
          titre="Accès réservé"
          texte="Cet espace est réservé aux administrateurs et aux modérateurs IFAWA."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageTitle kicker="Gestion">Modération des contributions</PageTitle>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat
          label="En attente"
          value={items.filter((item) => item.status === "submitted").length}
        />
        <Stat
          label="En examen"
          value={items.filter((item) => item.status === "under_review").length}
        />
        <Stat
          label="À corriger"
          value={items.filter((item) => item.status === "needs_review").length}
        />
        <Stat label="Validées" value={items.filter((item) => item.status === "approved").length} />
        <Stat label="Refusées" value={items.filter((item) => item.status === "rejected").length} />
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-clay/10 p-3 text-sm text-clay">
          {error}
        </p>
      )}
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="group"
        aria-label="Filtrer les contributions"
      >
        {(
          [
            ["submitted", "En attente"],
            ["under_review", "En examen"],
            ["needs_review", "À corriger"],
            ["approved", "Validées"],
            ["rejected", "Refusées"],
            ["all", "Toutes"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-4 py-2 text-sm",
              filter === value ? "bg-forest text-ivory" : "bg-ivory-deep",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <SearchField
        value={query}
        onChange={setQuery}
        placeholder="Rechercher un signe, un auteur…"
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <Panel className="space-y-2">
          <Kicker>File de modération · {filtered.length}</Kicker>
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={cn(
                "w-full rounded-2xl border p-4 text-left transition-colors",
                selectedId === item.id
                  ? "border-clay bg-clay/5"
                  : "border-umber/10 bg-ivory-deep/40 hover:bg-ivory-deep",
              )}
            >
              <span className="text-xs font-medium text-clay">{statusLabels[item.status]}</span>
              <span className="mt-1 block font-semibold">{item.signName}</span>
              <span className="mt-1 block text-xs text-umber-soft">
                {item.authorName} · {new Date(item.createdAt).toLocaleDateString("fr-FR")}
              </span>
            </button>
          ))}
          {!filtered.length && (
            <Empty titre="Aucun résultat" texte="Aucune contribution dans ce filtre." />
          )}
        </Panel>
        {selected ? (
          <ReviewPanel key={selected.id} item={selected} onReviewed={refresh} />
        ) : (
          <Panel>
            <Empty titre="Sélectionnez une contribution" texte="Son contenu apparaîtra ici." />
          </Panel>
        )}
      </div>
    </Shell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Panel tone="deep">
      <p className="text-xs text-umber-soft">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Panel>
  );
}

function ReviewPanel({
  item,
  onReviewed,
}: {
  item: AdminContribution;
  onReviewed: () => Promise<void>;
}) {
  const [note, setNote] = useState(item.reviewerNote);
  const [events, setEvents] = useState<ModerationEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    loadModerationEvents(item.id)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, [item.id]);

  async function decide(
    decision: "under_review" | "needs_review" | "approved" | "rejected" | "archived",
  ) {
    if (busy) return;
    setBusy(true);
    setStatus("");
    try {
      await moderateContribution(item.id, decision, note);
      setStatus("Décision enregistrée.");
      await onReviewed();
      setEvents(await loadModerationEvents(item.id));
    } catch (reason) {
      setStatus(
        reason instanceof Error ? reason.message : "La décision n’a pas pu être enregistrée.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Kicker>
            {item.category} · {statusLabels[item.status]}
          </Kicker>
          <h2 className="mt-2 text-2xl font-semibold">{item.signName}</h2>
          <p className="mt-1 text-sm text-umber-soft">Proposée par {item.authorName}</p>
        </div>
        <ShieldCheck className="size-6 text-clay" aria-hidden="true" />
      </div>
      <div className="my-5 rounded-2xl bg-ivory-deep/60 p-4">
        <p className="whitespace-pre-wrap text-sm leading-7">{item.body}</p>
      </div>
      <label className="block text-sm font-medium">
        Note de modération
        <textarea
          className={cn(inputCls, "mt-2 min-h-28")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Expliquez les corrections demandées ou le motif du refus."
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.status === "submitted" && (
          <Btn
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void decide("under_review")}
          >
            <Clock3 className="size-4" /> Prendre en charge
          </Btn>
        )}
        <Btn type="button" disabled={busy} onClick={() => void decide("approved")}>
          <Check className="size-4" /> Valider
        </Btn>
        <Btn
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => void decide("needs_review")}
        >
          <RotateCcw className="size-4" /> Demander une correction
        </Btn>
        <Btn type="button" variant="quiet" disabled={busy} onClick={() => void decide("rejected")}>
          <X className="size-4" /> Refuser
        </Btn>
      </div>
      {status && (
        <p role="status" className="mt-3 text-sm text-clay">
          {status}
        </p>
      )}
      <div className="mt-7 border-t border-umber/10 pt-5">
        <Kicker>Historique</Kicker>
        <div className="mt-3 space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex gap-3 text-sm">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-clay" aria-hidden="true" />
              <div>
                <p className="font-medium">{actionLabels[event.action] ?? event.action}</p>
                {event.note && <p className="mt-1 text-umber-soft">{event.note}</p>}
                <p className="mt-1 text-xs text-umber-soft">
                  {new Date(event.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            </div>
          ))}
          {!events.length && (
            <p className="flex items-center gap-2 text-sm text-umber-soft">
              <FileCheck2 className="size-4" /> Aucun événement enregistré.
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}
