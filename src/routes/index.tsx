import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ifawa/primitives";
import cover from "@/assets/cover.jpg";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

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
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-screen bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Logo />
          <span className="label-mono text-umber-soft">Plateforme</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16">
        <section className="pt-12 sm:pt-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            <div className="animate-rise">
              <p className="label-mono mb-4 text-clay">Bienvenue sur Ifawa</p>
              <h1 className="font-display text-[58px] uppercase leading-[0.86] tracking-tight sm:text-[84px]">
                <span className="block skew-x-[-4deg]">Découvre</span>
                <span className="block skew-x-[-4deg] text-clay">ton signe</span>
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
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-clay transition-colors hover:text-umber"
            >
              J'ai déjà un compte →
            </Link>
          </div>
        </section>

        <section className="mt-14 border-t border-umber/10 pt-8">
          <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr] sm:items-center">
            <img
              src={cover}
              alt="Bois gravé de lignes fines, motif de plateau de divination"
              width={1600}
              height={600}
              className="aspect-[8/3] w-full object-cover"
            />
            <div>
              <p className="label-mono mb-3 text-brass">Ce que vous trouverez</p>
              <ul className="space-y-2.5 text-[14px] leading-relaxed text-umber-soft">
                <li>Un fil d'actualité et une communauté de membres.</li>
                <li>Une bibliothèque des seize signes-mères.</li>
                <li>Des services : consultation, initiation, étude, accompagnement.</li>
                <li>Un dossier Fa personnel et un carnet de parcours.</li>
              </ul>
              <Link
                to="/accueil"
                className="mt-6 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-clay"
              >
                Explorer la plateforme →
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 bg-umber p-5 text-ivory">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="label-mono mb-2 text-brass">Application mobile</p>
              <h2 className="font-display text-[28px] uppercase leading-none">Installer Ifawa</h2>
              <p className="mt-2 max-w-[46ch] text-[13px] leading-relaxed text-ivory/70">
                Ajoutez Ifawa à l'écran d'accueil de votre téléphone pour y accéder plus vite.
              </p>
            </div>
            <button
              type="button"
              onClick={installApp}
              disabled={!installPrompt || installed}
              className="bg-clay px-4 py-3 font-mono text-[10px] uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-clay/90 disabled:bg-ivory/10 disabled:text-ivory/45"
            >
              {installed ? "Installée" : installPrompt ? "Installer" : "Disponible depuis le navigateur"}
            </button>
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
      className={`group relative animate-skew-in overflow-hidden p-6 text-left text-ivory transition-transform hover:-translate-y-0.5 ${
        tone === "forest" ? "bg-forest" : "bg-umber"
      }`}
    >
      <span className="absolute inset-y-0 w-24 -skew-x-12 animate-sheen bg-ivory/10" />
      <div className="relative">
        <p className="label-mono mb-3 text-brass">{parcours}</p>
        <h2 className="mb-2 font-display text-[30px] uppercase leading-tight">{titre}</h2>
        <p className="text-[14px] leading-relaxed text-ivory/75">{texte}</p>
        <span className="mt-5 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-brass transition-colors group-hover:text-ivory">
          {cta} →
        </span>
      </div>
    </Link>
  );
}
