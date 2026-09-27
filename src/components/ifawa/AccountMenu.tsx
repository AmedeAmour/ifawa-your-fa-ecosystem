import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useEffect } from "react";
import {
  Briefcase,
  ChevronDown,
  FilePenLine,
  FolderOpen,
  LogOut,
  Route,
  Settings,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profil } from "@/lib/store";
import { loadAdminAccess } from "@/lib/ifawa-admin";
import { Monogram } from "./primitives";

const links = [
  { to: "/profil", label: "Mon profil", icon: User },
  { to: "/dossier", label: "Mes dossiers Fa", icon: FolderOpen },
  { to: "/services", label: "Services", icon: Briefcase },
  { to: "/carnet", label: "Mon parcours", icon: Route },
  { to: "/contribuer", label: "Proposer une contribution", icon: FilePenLine },
  { to: "/parametres", label: "Profil et confidentialité", icon: Settings },
] as const;

export function AccountMenu({
  profil,
  onSignOut,
}: {
  profil: Profil;
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canModerate, setCanModerate] = useState(false);
  useEffect(() => {
    let active = true;
    loadAdminAccess()
      .then((role) => {
        if (active) setCanModerate(Boolean(role));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  async function disconnect() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onSignOut();
      setOpen(false);
    } catch {
      setError("La déconnexion n’a pas abouti. Réessayez.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Ouvrir le menu du compte"
          className="relative ml-1 grid size-11 shrink-0 place-items-center rounded-full border border-clay/30 bg-card ring-2 ring-clay/10 ring-offset-2 ring-offset-ivory transition-shadow hover:ring-clay/30 data-[state=open]:ring-clay/40"
        >
          <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={36} tone="umber" />
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 grid size-4 place-items-center rounded-full border border-ivory bg-ivory-deep text-umber"
          >
            <ChevronDown className="size-3" />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        collisionPadding={12}
        aria-label="Menu du compte"
        className="w-64 max-w-[calc(100vw-1.5rem)] rounded-2xl border-umber/10 bg-card p-2 text-umber shadow-xl shadow-umber/10"
      >
        <DropdownMenuLabel className="px-3 py-2.5 font-normal">
          <p className="break-words text-[15px] font-semibold">{profil.pseudo}</p>
          <p className="mt-0.5 text-[13px] text-umber-soft">
            {profil.initie
              ? `Initié${profil.signe ? ` · ${profil.signe}` : ""}`
              : "Parcours découverte"}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 bg-umber/10" />
        {links.map(({ to, label, icon: Icon }) => (
          <DropdownMenuItem
            key={to}
            asChild
            className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 text-[14px] focus:bg-ivory-deep focus:text-umber"
          >
            <Link to={to}>
              <Icon className="text-clay" aria-hidden="true" />
              {label}
            </Link>
          </DropdownMenuItem>
        ))}
        {canModerate && (
          <DropdownMenuItem
            asChild
            className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 text-[14px] focus:bg-ivory-deep focus:text-umber"
          >
            <Link to="/admin">
              <ShieldCheck className="text-clay" aria-hidden="true" />
              Administration
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="mx-1 bg-umber/10" />
        <DropdownMenuItem
          disabled={busy}
          onSelect={(event) => {
            event.preventDefault();
            void disconnect();
          }}
          className="min-h-11 cursor-pointer gap-3 rounded-lg px-3 text-[14px] text-clay focus:bg-clay/10 focus:text-clay"
        >
          <LogOut aria-hidden="true" />
          {busy ? "Déconnexion…" : "Se déconnecter"}
        </DropdownMenuItem>
        {error && (
          <p role="alert" className="px-3 py-2 text-sm text-clay">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
