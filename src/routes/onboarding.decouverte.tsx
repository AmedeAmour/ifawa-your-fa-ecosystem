import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Logo, Btn, Field, inputCls, Monogram, Chip } from "@/components/ifawa/primitives";
import { actions } from "@/lib/store";
import { signUpWithOnboarding } from "@/lib/ifawa-auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding/decouverte")({
  head: () => ({
    meta: [
      { title: "Créer mon espace de découverte — IFAWA" },
      {
        name: "description",
        content:
          "Un parcours court pour les personnes non encore initiées qui souhaitent découvrir le Fa sur Ifawa.",
      },
      { property: "og:title", content: "Créer mon espace de découverte — IFAWA" },
      {
        property: "og:description",
        content: "Trois étapes pour ouvrir votre espace de découverte du Fa.",
      },
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
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (i: string) =>
    setChoisis((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));

  const draft = {
    pseudo: pseudo.trim() ? (pseudo.startsWith("@") ? pseudo : `@${pseudo}`) : "@Vous",
    avatarUrl,
    avatarFile: avatarFile ?? undefined,
    initie: false,
    interets: choisis,
    miseEnRelation: false,
  };

  const suivant = async () => {
    if (etape < 4) return setEtape(etape + 1);
    setError("");
    setLoading(true);
    try {
      const result = await signUpWithOnboarding(email, password, draft);
      actions.majProfil(draft);
      if (result.status === "signed-in") {
        navigate({ to: "/accueil" });
      } else {
        setConfirmation(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Logo />
          <span className="label-mono text-umber-soft">Étape {Math.min(etape + 1, 5)} / 5</span>
        </div>
      </header>
      <div className="h-0.5 bg-ivory-deep">
        <div
          className="h-0.5 bg-clay transition-all duration-500"
          style={{ width: `${((etape + 1) / 5) * 100}%` }}
        />
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
              <input
                className={inputCls}
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Ayaba"
              />
            </Field>
          </>
        )}

        {etape === 1 && (
          <>
            <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
              Une photo de profil ?
            </h1>
            <p className="mb-7 mt-3 text-[14px] leading-relaxed text-umber-soft">
              Facultatif — vous pouvez le faire plus tard.
            </p>
            <div className="flex items-center gap-4">
              <Monogram name={pseudo || "Vous"} imageUrl={avatarUrl} size={72} />
              <input
                className={inputCls}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  const reader = new FileReader();
                  reader.onload = () => setAvatarUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
            </div>
          </>
        )}

        {etape === 2 && (
          <>
            <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
              Qu'aimeriez-vous découvrir ?
            </h1>
            <p className="mb-7 mt-3 text-[14px] leading-relaxed text-umber-soft">
              Facultatif — pour adapter votre espace de découverte.
            </p>
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
              Vous avez accès à la bibliothèque, au fil d'actualité, à la communauté et aux
              services. Vous pourrez indiquer votre initiation à tout moment depuis votre profil.
            </p>
          </div>
        )}

        {etape === 4 && (
          <div className="animate-rise">
            <h1 className="font-display text-[32px] uppercase leading-[0.95] tracking-tight sm:text-[40px]">
              Créez votre compte
            </h1>
            <p className="mb-7 mt-3 text-[14px] leading-relaxed text-umber-soft">
              Votre parcours est prêt. Indiquez seulement votre adresse email et un mot de passe.
            </p>
            {confirmation ? (
              <div className="bg-forest p-5 text-ivory">
                <p className="font-display text-[26px] uppercase leading-none">Compte créé</p>
                <p className="mt-3 text-[14px] leading-relaxed text-ivory/75">
                  Connectez-vous pour accéder à votre espace Ifawa.
                </p>
                <Btn to="/connexion" className="mt-5" variant="outline">
                  Se connecter
                </Btn>
              </div>
            ) : (
              <div className="space-y-4">
                <Field label="Adresse email">
                  <input
                    className={inputCls}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Mot de passe">
                  <input
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                  />
                </Field>
                {error && <p className="bg-clay/10 px-3 py-2 text-[13px] text-clay">{error}</p>}
              </div>
            )}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <button
            onClick={() => (etape === 0 ? history.back() : setEtape(etape - 1))}
            className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-umber-soft hover:text-clay"
          >
            <ChevronLeft className="size-3.5" /> Retour
          </button>
          {!confirmation && (
            <Btn
              onClick={suivant}
              disabled={etape === 4 && (loading || !email.trim() || password.length < 6)}
              className={cn(etape === 4 && "px-8")}
            >
              {etape === 4 ? (loading ? "Création..." : "Créer mon compte") : "Continuer"}
            </Btn>
          )}
        </div>
      </main>
    </div>
  );
}
