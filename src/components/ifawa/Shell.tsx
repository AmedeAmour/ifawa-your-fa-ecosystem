import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Home,
  Library,
  Users,
  MessageSquare,
  User,
  Bell,
  Briefcase,
  Search,
  FolderOpen,
  Route as RouteIcon,
  Shield,
  Settings,
  LogIn,
  LogOut,
} from "lucide-react";
import { Logo, Monogram, Panel, Kicker } from "./primitives";
import { actions, useApp } from "@/lib/store";
import { membres } from "@/data/mock";
import { cn } from "@/lib/utils";
import { getCurrentUser, loadCurrentProfile, onAuthUserChange, signOut } from "@/lib/ifawa-auth";

const mainNav = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/fa", label: "Fa", icon: Library },
  { to: "/reseau", label: "Réseau", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageSquare },
  { to: "/profil", label: "Profil", icon: User },
] as const;

const sideExtra = [
  { to: "/services", label: "Services", icon: Briefcase },
  { to: "/dossier", label: "Mon dossier Fa", icon: FolderOpen },
  { to: "/carnet", label: "Carnet de parcours", icon: RouteIcon },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/parametres", label: "Confidentialité", icon: Settings },
  { to: "/admin", label: "Administration", icon: Shield },
] as const;

export function Shell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { profil, notifications } = useApp();
  const [connected, setConnected] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const nonLues = authChecked ? notifications.filter((n) => n.nonLue).length : 0;

  useEffect(() => {
    actions.hydratePersistedState();
    let alive = true;
    getCurrentUser().then((user) => {
      if (!alive) return;
      setConnected(Boolean(user));
      actions.setCurrentUserId(user?.id);
      setAuthChecked(true);
      if (!user) navigate({ to: "/connexion" });
      if (alive && user) {
        loadCurrentProfile().then((profile) => {
          if (profile) actions.majProfil(profile);
        });
      }
    });
    const unsubscribe = onAuthUserChange((user) => {
      setConnected(Boolean(user));
      actions.setCurrentUserId(user?.id);
      setAuthChecked(true);
      if (!user) navigate({ to: "/connexion" });
      if (user) {
        loadCurrentProfile().then((profile) => {
          if (profile) actions.majProfil(profile);
        });
      }
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [navigate]);

  async function disconnect() {
    await signOut();
    setConnected(false);
    navigate({ to: "/connexion" });
  }

  return (
    <div className="min-h-screen bg-ivory text-umber">
      <header className="sticky top-0 z-30 border-b border-umber/10 bg-ivory/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link to="/accueil" className="flex items-center">
            <Logo />
          </Link>
          <Link
            to="/recherche"
            className="hidden flex-1 items-center gap-2 border border-umber/15 bg-card px-3 py-2 text-[13px] text-umber-soft/70 transition-colors hover:border-clay sm:flex"
          >
            <Search className="size-3.5" />
            Rechercher un signe, un membre, une publication…
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/recherche"
              className="grid size-9 place-items-center text-umber-soft sm:hidden"
            >
              <Search className="size-4.5" />
            </Link>
            <Link
              to="/notifications"
              className="relative grid size-9 place-items-center text-umber-soft hover:text-clay"
            >
              <Bell className="size-4.5" />
              {nonLues > 0 && (
                <span className="absolute right-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-clay font-mono text-[8px] text-ivory">
                  {nonLues}
                </span>
              )}
            </Link>
            {connected ? (
              <>
                <Link to="/profil" className="ml-1">
                  <Monogram
                    name={profil.pseudo}
                    imageUrl={profil.avatarUrl}
                    size={40}
                    tone="umber"
                  />
                </Link>
                <button
                  type="button"
                  onClick={disconnect}
                  className="grid size-9 place-items-center text-umber-soft transition-colors hover:text-clay"
                  aria-label="Se déconnecter"
                >
                  <LogOut className="size-4.5" />
                </button>
              </>
            ) : (
              <Link
                to="/connexion"
                className="inline-flex items-center gap-2 px-2.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-umber-soft transition-colors hover:text-clay sm:px-3"
              >
                <LogIn className="size-4" />
                <span className="hidden sm:inline">Connexion</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {!authChecked || !connected ? (
        <main className="mx-auto grid min-h-[calc(100vh-3.5rem)] max-w-2xl place-items-center px-5 text-center">
          <div>
            <p className="label-mono mb-3 text-clay">Connexion requise</p>
            <h1 className="font-display text-[34px] uppercase leading-none">Accès réservé</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-umber-soft">
              Connectez-vous pour accéder à votre espace Ifawa.
            </p>
          </div>
        </main>
      ) : (
        <div className="mx-auto flex max-w-6xl gap-6 px-4 pb-28 pt-6 lg:pb-10">
          <aside className="hidden w-52 shrink-0 lg:block">
            <nav className="sticky top-20 space-y-0.5">
              {mainNav.map((n) => (
                <SideLink key={n.to} {...n} active={pathname.startsWith(n.to)} />
              ))}
              <div className="my-3 h-px bg-umber/10" />
              {sideExtra.map((n) => (
                <SideLink key={n.to} {...n} active={pathname.startsWith(n.to)} />
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">{children}</main>

          <aside className="hidden w-72 shrink-0 xl:block">
            <div className="sticky top-20 space-y-4">{right ?? <DefaultRail />}</div>
          </aside>
        </div>
      )}

      {authChecked && connected && <BottomNav pathname={pathname} />}
    </div>
  );
}

function SideLink({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      to={to as any}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-colors",
        active ? "bg-umber text-ivory" : "text-umber-soft hover:bg-ivory-deep hover:text-umber",
      )}
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}

function DefaultRail() {
  const { profil } = useApp();
  const memes = membres.filter((m) => m.signe === profil.signe).slice(0, 3);
  return (
    <>
      <Panel tone="forest">
        <Kicker className="text-brass">Votre signe</Kicker>
        <p className="mt-2 font-display text-[24px] uppercase leading-none">{profil.signe}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ivory/75">
          Initié depuis {profil.annee} · {profil.satisfaction}
        </p>
        <Link
          to="/fa/$slug"
          params={{ slug: "gbe-medji" }}
          className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-brass hover:text-ivory"
        >
          Ouvrir la fiche →
        </Link>
      </Panel>

      <Panel>
        <Kicker className="mb-3">Même signe que vous</Kicker>
        <ul className="space-y-3">
          {memes.map((m) => (
            <li key={m.id} className="flex items-center gap-3">
              <Monogram name={m.pseudo} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold">{m.pseudo}</p>
                <p className="label-mono text-umber-soft">Initié en {m.annee}</p>
              </div>
            </li>
          ))}
        </ul>
        <Link
          to="/reseau"
          className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-clay"
        >
          Voir le réseau →
        </Link>
      </Panel>

      <Panel tone="deep">
        <Kicker className="mb-3">Raccourcis</Kicker>
        <ul className="space-y-2 text-[13px]">
          <li>
            <Link to="/services/consultation" className="hover:text-clay">
              Consultation Fa →
            </Link>
          </li>
          <li>
            <Link to="/suivi" className="hover:text-clay">
              Suivre ma consultation →
            </Link>
          </li>
          <li>
            <Link to="/accompagnement" className="hover:text-clay">
              Mon accompagnement →
            </Link>
          </li>
          <li>
            <Link to="/contribuer" className="hover:text-clay">
              Proposer une contribution →
            </Link>
          </li>
        </ul>
      </Panel>
    </>
  );
}

function BottomNav({ pathname }: { pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-umber/10 bg-ivory/98 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {mainNav.map((n) => {
          const active = pathname.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              to={n.to as any}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-2.5 transition-colors",
                active ? "text-clay" : "text-umber-soft",
              )}
            >
              <Icon className="size-5" />
              <span className="font-mono text-[9px] uppercase tracking-[0.1em]">{n.label}</span>
            </Link>
          );
        })}
      </div>
      <Link
        to="/services"
        className="absolute -top-12 right-4 grid size-11 place-items-center rounded-full bg-clay text-ivory shadow-lg"
        aria-label="Services Ifawa"
      >
        <Briefcase className="size-5" />
      </Link>
    </nav>
  );
}
