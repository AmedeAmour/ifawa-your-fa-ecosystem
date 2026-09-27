import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Logo } from "@/components/ifawa/primitives";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IFAWA — La plateforme du Fa : connaissance et communauté" },
      {
        name: "description",
        content:
          "Découvrez, échangez et approfondissez votre connaissance du Fa. Bibliothèque des seize signes, communauté d'initiés et services d'accompagnement.",
      },
      { property: "og:title", content: "IFAWA — La plateforme du Fa" },
      {
        property: "og:description",
        content:
          "Découvrez, échangez et approfondissez votre connaissance du Fa dans un espace calme et confidentiel.",
      },
    ],
  }),
  component: Bienvenue,
});

function Bienvenue() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Logo />
          <Link
            to="/connexion"
            className="inline-flex min-h-11 items-center rounded-full border border-umber/15 px-4 text-sm font-semibold"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 pb-16">
        <section className="pt-12 sm:pt-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="animate-rise">
              <p className="label-mono mb-4 text-clay">Bienvenue sur Ifawa</p>
              <h1 className="font-display text-[42px] font-semibold leading-[1.08] tracking-tight sm:text-[64px]">
                <span className="block">Le Fa,</span>
                <span className="block skew-x-[-4deg] text-clay">ensemble.</span>
              </h1>
            </div>
            <p className="max-w-[34ch] text-pretty text-[15px] leading-relaxed text-umber-soft sm:mb-3">
              Découvrez, échangez et approfondissez votre connaissance du Fa dans un espace calme,
              confidentiel et vivant.
            </p>
          </div>

          <div className="mt-9 grid gap-4 sm:grid-cols-2">
            <Carte
              to="/onboarding/initie"
              parcours="Parcours 01"
              titre="Je suis initié(e)"
              texte="J'ai déjà reçu mon signe Fa."
              cta="Continuer"
              tone="forest"
            />
            <Carte
              to="/onboarding/decouverte"
              parcours="Parcours 02"
              titre="Je découvre le Fa"
              texte="Je souhaite découvrir le Fa et mieux comprendre cet univers."
              cta="Commencer"
              tone="ink"
            />
          </div>
          <div className="mt-5 flex justify-center">
            <Link
              to="/connexion"
              className="font-medium text-[13px] text-clay transition-colors hover:text-umber"
            >
              J'ai déjà un compte →
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-umber/10 py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 text-[12px] text-umber-soft">
          <span>Plateforme Ifawa — connaissance, communauté et accompagnement.</span>
          <span className="font-display uppercase tracking-tight">Ifawa</span>
        </div>
      </footer>
    </div>
  );
}

function Carte({
  to,
  parcours,
  titre,
  texte,
  cta,
  tone,
}: {
  to: string;
  parcours: string;
  titre: string;
  texte: string;
  cta: string;
  tone: "forest" | "ink";
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className={`group relative animate-skew-in overflow-hidden rounded-2xl p-6 text-left text-ivory transition-transform hover:-translate-y-0.5 ${
        tone === "forest" ? "bg-forest" : "bg-umber"
      }`}
    >
      <span className="absolute inset-y-0 w-24 -skew-x-12 animate-sheen bg-ivory/10" />
      <div className="relative">
        <p className="label-mono mb-3 text-brass">{parcours}</p>
        <h2 className="mb-2 font-display text-[28px] font-semibold leading-tight tracking-tight">
          {titre}
        </h2>
        <p className="text-[14px] leading-relaxed text-ivory/75">{texte}</p>
        <span className="mt-5 inline-block font-medium text-[13px] text-brass transition-colors group-hover:text-ivory">
          {cta} →
        </span>
      </div>
    </Link>
  );
}
