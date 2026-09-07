import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Logo, Btn, Field, inputCls, Monogram, Chip } from "@/components/ifawa/primitives";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding/decouverte")({
  head: () => ({
    meta: [
      { title: "Créer mon espace de découverte — IFAWA" },
      { name: "description", content: "Un parcours court pour les personnes non encore initiées qui souhaitent découvrir le Fa sur Ifawa." },
      { property: "og:title", content: "Créer mon espace de découverte — IFAWA" },
      { property: "og:description", content: "Trois étapes pour ouvrir votre espace de découverte du Fa." },
    ],
  }),
  component: OnboardingDecouverte,
});

const interets = [
  "Comprendre les signes",
  "Histoire et culture",
  "Témoignages",
  "Préparer une initiation",
  "Échanger avec la communauté",
  "Consultations",
];

function OnboardingDecouverte() {
  const navigate = useNavigate();
  const [etape, setEtape] = useState(0);
  const [pseudo, setPseudo] = useState("");
  const [choisis, setChoisis] = useState<string[]>([]);

  const toggle = (i: string) =>
    setChoisis((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));

  const suivant = () => {
    if (etape < 3) return setEtape(etape + 1);
    actions.majProfil({
      pseudo: pseudo.trim() ? (pseudo.startsWith("@") ? pseudo : `@${pseudo}`) : "@Vous",
      initie: false,
      interets: choisis,
    });
    navigate({ to: "/accueil" });
  };

  return (
    <div className="min-h-screen bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Logo />
          <span className="label-mono text-umber-soft">Étape {Math.min(etape + 1, 3)} / 3</span>
        </div>
      </header>
      <div className="h-0.5 bg-ivory-deep">
        <div className="h-0.5 bg-clay transition-all duration-500" style={{ width: `${((etape + 1) / 4) * 100}%` }} />
      </div>

      <main className="mx-auto max-w-2xl animate-rise px-5 pb-24 pt-10">
        {etape === 0 && (
          <>
            <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
              Comment souhaitez-vous être appelé(e) ?
            </h1>
            <p className="mb-7 mt-3 text-[14px] leading-relaxed text-umber-soft">
              Votre pseudonyme est visible par les autres membres.
            </p>
            <Field label="Pseudonyme">
              <input className={inputCls} value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Ayaba" />
            </Field>
          </>
        )}

        {etape === 1 && (
          <>
            <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
              Une photo de profil ?
            </h1>
            <p className="mb-7 mt-3 text-[14px] leading-relaxed text-umber-soft">Facultatif — vous pouvez le faire plus tard.</p>
            <div className="flex items-center gap-4">
              <Monogram name={pseudo || "Vous"} size={72} />
              <Btn variant="outline">Choisir une image</Btn>
            </div>
          </>
        )}

        {etape === 2 && (
          <>
            <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
              Qu'aimeriez-vous découvrir ?
            </h1>
            <p className="mb-7 mt-3 text-[14px] leading-relaxed text-umber-soft">Facultatif — pour adapter votre espace de découverte.</p>
            <div className="flex flex-wrap gap-2">
              {interets.map((i) => (
                <Chip key={i} active={choisis.includes(i)} onClick={() => toggle(i)}>
                  {i}
                </Chip>
              ))}
            </div>
          </>
        )}

        {etape === 3 && (
          <div className="bg-forest p-8 text-ivory">
            <p className="label-mono mb-3 text-brass">C'est prêt</p>
            <h1 className="font-display text-[34px] uppercase leading-[0.95] tracking-tight">
              Votre espace de découverte est prêt.
            </h1>
            <p className="mt-4 max-w-[44ch] text-[14px] leading-relaxed text-ivory/75">
              Vous avez accès à la bibliothèque, au fil d'actualité, à la communauté et aux services.
              Vous pourrez indiquer votre initiation à tout moment depuis votre profil.
            </p>
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => (etape === 0 ? history.back() : setEtape(etape - 1))}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-umber-soft hover:text-clay"
          >
            <ChevronLeft className="size-3.5" /> Retour
          </button>
          <Btn onClick={suivant} className={cn(etape === 3 && "px-8")}>
            {etape === 3 ? "Accéder à Ifawa" : "Continuer"}
          </Btn>
        </div>
      </main>
    </div>
  );
}
