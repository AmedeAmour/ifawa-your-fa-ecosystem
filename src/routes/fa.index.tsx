import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Shell } from "@/components/ifawa/Shell";
import { PageTitle, Panel, Btn } from "@/components/ifawa/primitives";
import { signes } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fa/")({
  head: () => ({
    meta: [
      { title: "Bibliothèque du Fa — les 16 signes-mères | IFAWA" },
      { name: "description", content: "Parcourez les seize signes-mères du Fa : fiches structurées, enseignements, variantes et contributions validées." },
      { property: "og:title", content: "Bibliothèque du Fa — les 16 signes-mères" },
      { property: "og:description", content: "Seize fiches structurées, contributions de la communauté Ifawa." },
    ],
  }),
  component: Bibliotheque,
});

function Bibliotheque() {
  const [q, setQ] = useState("");
  const liste = signes.filter((s) => s.nom.toLowerCase().includes(q.toLowerCase()));

  return (
    <Shell>
      <PageTitle kicker="Bibliothèque du Fa">Les seize signes-mères</PageTitle>

      <Panel tone="deep" className="mb-5">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-umber-soft" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un signe…"
            className="w-full bg-transparent text-[14px] outline-none placeholder:text-umber-soft/60"
          />
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {liste.map((s, i) => (
          <Link
            key={s.slug}
            to="/fa/$slug"
            params={{ slug: s.slug }}
            className={cn(
              "group animate-rise p-4 transition-transform hover:-translate-y-0.5",
              i % 5 === 1 ? "rounded-2xl bg-forest text-ivory" : "bg-card carved",
            )}
            style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
          >
            <p className={cn("label-mono", i % 5 === 1 ? "text-brass" : "text-clay")}>{s.numero}</p>
            <p className="mt-2 font-display text-[19px] uppercase leading-tight">{s.nom}</p>
            <p className={cn("mt-1.5 text-[12px] leading-snug", i % 5 === 1 ? "text-ivory/70" : "text-umber-soft")}>
              {s.soustitre}
            </p>
            <p className={cn("label-mono mt-3", i % 5 === 1 ? "text-ivory/50" : "text-umber-soft/70")}>
              {s.membres} membres
            </p>
          </Link>
        ))}
      </div>

      {liste.length === 0 && (
        <p className="py-10 text-center text-[14px] text-umber-soft">Aucun signe ne correspond à « {q} ».</p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Btn to="/contribuer" variant="outline">Proposer une contribution</Btn>
      </div>
    </Shell>
  );
}
