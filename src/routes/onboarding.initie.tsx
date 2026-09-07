import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronLeft } from "lucide-react";
import { Logo, Btn, Field, inputCls, Chip, Monogram } from "@/components/ifawa/primitives";
import { signes } from "@/data/mock";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding/initie")({
  head: () => ({
    meta: [
      { title: "Créer mon profil initié — IFAWA" },
      { name: "description", content: "Renseignez votre signe, votre année d'initiation et votre témoignage pour rejoindre la communauté Ifawa." },
      { property: "og:title", content: "Créer mon profil initié — IFAWA" },
      { property: "og:description", content: "Un parcours guidé en sept étapes pour les personnes déjà initiées." },
    ],
  }),
  component: OnboardingInitie,
});

const satisfactions = ["Très insatisfait", "Insatisfait", "Mitigé", "Satisfait", "Très satisfait"];
const etapes = ["Pseudonyme", "Photo", "Signe Fa", "Année", "Satisfaction", "Témoignage", "Mise en relation"];

function OnboardingInitie() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState(0);
  const [pseudo, setPseudo] = useState("");
  const [signe, setSigne] = useState("Gbé Mêdji");
  const [annee, setAnnee] = useState("2018");
  const [satisfaction, setSatisfaction] = useState("Satisfait");
  const [temoignage, setTemoignage] = useState("");
  const [relation, setRelation] = useState(true);

  const suivant = () => {
    if (etape < etapes.length - 1) return setEtape(etape + 1);
    actions.majProfil({
      pseudo: pseudo.trim() ? (pseudo.startsWith("@") ? pseudo : `@${pseudo}`) : "@Vous",
      initie: true,
      signe,
      annee,
      satisfaction,
      temoignage: temoignage.trim() || "Témoignage non renseigné pour le moment.",
      miseEnRelation: relation,
    });
    navigate({ to: "/accueil" });
  };

  return (
    <div className="min-h-screen bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Logo />
          <span className="label-mono text-umber-soft">
            Étape {etape + 1} / {etapes.length}
          </span>
        </div>
      </header>

      <div className="h-0.5 bg-ivory-deep">
        <div
          className="h-0.5 bg-clay transition-all duration-500"
          style={{ width: `${((etape + 1) / etapes.length) * 100}%` }}
        />
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
        <p className="label-mono mb-3 text-clay">{etapes[etape]}</p>

        <div key={etape} className="animate-rise">
          {etape === 0 && (
            <Step titre="Comment souhaitez-vous être appelé(e) ?" texte="Votre pseudonyme est visible par les autres membres. Votre identité réelle n'est jamais demandée.">
              <Field label="Pseudonyme">
                <input className={inputCls} value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Sègbo23" />
              </Field>
            </Step>
          )}

          {etape === 1 && (
            <Step titre="Ajoutez une photo de profil" texte="Cette étape est facultative. Vous pourrez la compléter plus tard.">
              <div className="flex items-center gap-4">
                <Monogram name={pseudo || "Vous"} size={72} />
                <div className="space-y-2">
                  <Btn variant="outline">Choisir une image</Btn>
                  <p className="text-[12px] text-umber-soft">Un monogramme est utilisé par défaut.</p>
                </div>
              </div>
            </Step>
          )}

          {etape === 2 && (
            <Step titre="Quel est votre signe Fa ?" texte="Sélectionnez le signe reçu lors de votre initiation.">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {signes.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => setSigne(s.nom)}
                    className={cn(
                      "p-3 text-left transition-colors",
                      signe === s.nom ? "bg-forest text-ivory" : "bg-ivory-deep/50 hover:bg-ivory-deep",
                    )}
                  >
                    <span className={cn("label-mono block", signe === s.nom ? "text-brass" : "text-clay")}>{s.numero}</span>
                    <span className="mt-1 block font-display text-[16px] uppercase leading-tight">{s.nom}</span>
                  </button>
                ))}
              </div>
            </Step>
          )}

          {etape === 3 && (
            <Step titre="En quelle année avez-vous été initié(e) ?" texte="Cette information peut rester privée dans vos paramètres.">
              <Field label="Année d'initiation">
                <input className={inputCls} value={annee} onChange={(e) => setAnnee(e.target.value)} inputMode="numeric" />
              </Field>
            </Step>
          )}

          {etape === 4 && (
            <Step titre="Comment vous sentez-vous depuis votre initiation ?" texte="Votre réponse aide la communauté à mieux se comprendre.">
              <div className="space-y-2">
                {satisfactions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSatisfaction(s)}
                    className={cn(
                      "flex w-full items-center justify-between px-4 py-3 text-left text-[14px] transition-colors",
                      satisfaction === s ? "bg-umber text-ivory" : "bg-ivory-deep/50 hover:bg-ivory-deep",
                    )}
                  >
                    {s}
                    {satisfaction === s && <Check className="size-4" />}
                  </button>
                ))}
              </div>
            </Step>
          )}

          {etape === 5 && (
            <Step titre="Votre témoignage" texte="Parlez-nous brièvement de votre expérience depuis votre initiation.">
              <Field label="Témoignage">
                <textarea
                  className={cn(inputCls, "min-h-32 resize-y")}
                  value={temoignage}
                  onChange={(e) => setTemoignage(e.target.value)}
                  placeholder="Depuis mon initiation…"
                />
              </Field>
            </Step>
          )}

          {etape === 6 && (
            <Step titre="Souhaitez-vous entrer en relation avec d'autres membres ?" texte="Vous pourrez modifier ce choix à tout moment dans vos paramètres.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Choix
                  actif={relation}
                  onClick={() => setRelation(true)}
                  titre="Oui"
                  texte="Je souhaite recevoir et envoyer des demandes de connexion."
                />
                <Choix
                  actif={!relation}
                  onClick={() => setRelation(false)}
                  titre="Non"
                  texte="Je souhaite utiliser Ifawa sans mise en relation."
                />
              </div>
            </Step>
          )}
        </div>

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => (etape === 0 ? history.back() : setEtape(etape - 1))}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-umber-soft hover:text-clay"
          >
            <ChevronLeft className="size-3.5" /> Retour
          </button>
          <div className="flex items-center gap-2">
            {etape < etapes.length - 1 && (
              <Chip onClick={() => setEtape(etape + 1)}>Passer</Chip>
            )}
            <Btn onClick={suivant}>{etape === etapes.length - 1 ? "Accéder à Ifawa" : "Continuer"}</Btn>
          </div>
        </div>
      </main>
    </div>
  );
}

function Step({ titre, texte, children }: { titre: string; texte: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-[30px] uppercase leading-[0.95] tracking-tight sm:text-[38px]">{titre}</h1>
      <p className="mb-7 mt-3 max-w-[46ch] text-[14px] leading-relaxed text-umber-soft">{texte}</p>
      {children}
    </div>
  );
}

function Choix({ actif, onClick, titre, texte }: { actif: boolean; onClick: () => void; titre: string; texte: string }) {
  return (
    <button
      onClick={onClick}
      className={cn("p-5 text-left transition-colors", actif ? "bg-forest text-ivory" : "bg-ivory-deep/50 hover:bg-ivory-deep")}
    >
      <p className="font-display text-[24px] uppercase leading-none">{titre}</p>
      <p className={cn("mt-2 text-[13px] leading-relaxed", actif ? "text-ivory/75" : "text-umber-soft")}>{texte}</p>
    </button>
  );
}
