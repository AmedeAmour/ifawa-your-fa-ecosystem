import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { loadMyServiceRequests, type ServiceRequest } from "@/lib/ifawa-services";
import { useApp } from "@/lib/store";
import { Shell } from "./Shell";
import { PrivateAudio } from "./PrivateAudio";
import { Btn, Empty, PageTitle, Panel } from "./primitives";

const labels: Record<string, string> = {
  submitted: "Demande reçue",
  reviewing: "En analyse",
  processing: "En traitement",
  completed: "Terminée",
  cancelled: "Annulée",
};
const services: Record<string, string> = {
  fa_consultation: "Consultation Fa",
  initiation_request: "Initiation",
  sign_deep_study: "Étude du signe",
  fa_accompaniment: "Accompagnement",
};

export function RequestsPage({ mode = "all" }: { mode?: "all" | "accompaniment" | "report" }) {
  const { currentUserId } = useApp();
  const search = useRouterState({ select: (s) => s.location.search as { request?: string } });
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!currentUserId) return;
    let alive = true;
    setLoading(true);
    loadMyServiceRequests()
      .then((items) => {
        if (alive) {
          setRequests(items);
          setError("");
        }
      })
      .catch(() => {
        if (alive) setError("Vos dossiers n’ont pas pu être chargés. Réessayez.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [currentUserId, retry]);
  const filtered =
    mode === "accompaniment"
      ? requests.filter((item) => item.serviceType === "fa_accompaniment")
      : requests;
  const selected = search.request ? filtered.find((item) => item.id === search.request) : undefined;
  return (
    <Shell>
      <PageTitle kicker="Votre espace personnel">
        {mode === "accompaniment"
          ? "Mon accompagnement"
          : mode === "report"
            ? "Mes résultats"
            : "Mes dossiers"}
      </PageTitle>
      {error ? (
        <Panel>
          <p role="alert" className="mb-3 text-clay">
            {error}
          </p>
          <Btn onClick={() => setRetry((n) => n + 1)} variant="outline">
            Réessayer
          </Btn>
        </Panel>
      ) : loading ? (
        <Empty titre="Chargement des dossiers" texte="Nous récupérons vos demandes." />
      ) : search.request && !selected ? (
        <Empty
          titre="Dossier introuvable"
          texte="Ce dossier n’est pas disponible dans votre espace."
        />
      ) : selected ? (
        <div className="space-y-4">
          <Link
            to="/dossier"
            className="inline-flex min-h-11 items-center text-sm font-medium text-clay"
          >
            ← Tous mes dossiers
          </Link>
          <Panel>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-sm text-umber-soft">
                {selected.id.slice(0, 8).toUpperCase()}
              </p>
              <span className="rounded-full bg-ivory-deep px-3 py-1.5 text-sm font-medium">
                {labels[selected.status] ?? selected.status}
              </span>
            </div>
            <h2 className="text-xl font-semibold">{selected.subject}</h2>
            <p className="mt-2 text-sm text-umber-soft">
              {services[selected.serviceType] ?? selected.serviceType}
              {selected.formulaName ? ` · ${selected.formulaName}` : ""}
            </p>
            <p className="mt-1 text-sm text-umber-soft">
              Demande du {new Date(selected.createdAt).toLocaleDateString("fr-FR")}
            </p>
            <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed">
              {selected.details ||
                (selected.audioPath
                  ? "Préoccupation transmise par audio."
                  : "Aucune précision complémentaire.")}
            </p>
            {selected.audioPath && <PrivateAudio path={selected.audioPath} />}
          </Panel>
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">Avancement</h2>
            {selected.status === "cancelled" ? (
              <p>Cette demande a été annulée.</p>
            ) : (
              <ol className="space-y-4">
                {["Demande reçue", "Analyse et traitement", "Résultat disponible"].map(
                  (step, index) => {
                    const done =
                      index === 0 ||
                      (index === 1 &&
                        ["reviewing", "processing", "completed"].includes(selected.status)) ||
                      (index === 2 && selected.status === "completed");
                    return (
                      <li key={step} className="flex items-center gap-3">
                        {done ? (
                          <CheckCircle2 className="size-5 text-forest" />
                        ) : (
                          <Clock3 className="size-5 text-umber-soft" />
                        )}
                        <span className="text-sm">{step}</span>
                      </li>
                    );
                  },
                )}
              </ol>
            )}
          </Panel>
          <Panel>
            <h2 className="mb-3 text-lg font-semibold">Compte rendu</h2>
            {selected.resultSummary ? (
              <p className="whitespace-pre-wrap text-base leading-relaxed">
                {selected.resultSummary}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-umber-soft">
                Aucun compte rendu n’a encore été transmis pour ce dossier.
              </p>
            )}
          </Panel>
        </div>
      ) : filtered.length ? (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to="/dossier"
              search={{ request: item.id } as never}
              className="block rounded-2xl border border-umber/10 bg-card p-5 transition-colors hover:border-clay/40"
            >
              <div className="flex items-start gap-3">
                <FileText className="mt-1 size-5 shrink-0 text-clay" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-umber-soft">
                    {services[item.serviceType] ?? item.serviceType}
                  </p>
                  <h2 className="mt-1 text-base font-semibold">{item.subject}</h2>
                  <p className="mt-2 text-sm text-umber-soft">
                    {new Date(item.createdAt).toLocaleDateString("fr-FR")} ·{" "}
                    {labels[item.status] ?? item.status}
                  </p>
                </div>
                <ArrowRight className="mt-1 size-4 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <>
          <Empty
            titre="Aucun dossier pour le moment"
            texte="Vos demandes, leur avancement et leurs résultats seront réunis ici."
          />
          <Btn to="/services" className="mt-4">
            Découvrir les services
          </Btn>
        </>
      )}
    </Shell>
  );
}
