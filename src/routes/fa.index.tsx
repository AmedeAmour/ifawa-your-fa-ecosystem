import { SearchField } from "@/components/ifawa/SearchField";
import { faSignCatalog } from "@/data/fa-signs";
import { matchesSearch } from "@/lib/search-text";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/ifawa/Shell";
import { PageTitle, Btn } from "@/components/ifawa/primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/fa/")({
  head: () => ({
    meta: [
      { title: "Les signes du Fa | IFAWA" },
      {
        name: "description",
        content: "Découvrez les 256 signes du Fa dans la bibliothèque Ifawa.",
      },
      { property: "og:title", content: "Les signes du Fa" },
      {
        property: "og:description",
        content: "Les seize signes-mères et leurs 240 signes dérivés.",
      },
    ],
  }),
  component: Bibliotheque,
});

function Bibliotheque() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("tous");
  const liste = faSignCatalog.filter(
    (s) =>
      (category === "tous" ||
        (category === "meres" ? s.type === "signe_mere" : s.type === "autre")) &&
      (!q.trim() || matchesSearch(`${s.nom} ${s.numero}`, q)),
  );

  return (
    <Shell>
      <PageTitle kicker="Bibliothèque du Fa">Les signes du Fa</PageTitle>

      <SearchField value={q} onChange={setQ} placeholder="Rechercher un signe…" />
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Catégories de signes">
        {[
          ["tous", "Tous"],
          ["meres", "Signes-mères"],
          ["autres", "Autres signes"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={category === value}
            onClick={() => setCategory(value ?? "tous")}
            className={cn(
              "rounded-full px-4 py-2 text-sm",
              category === value ? "bg-forest text-ivory" : "bg-ivory-deep",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {liste.map((s, i) => {
          const className = cn(
            "group flex h-10 items-center justify-center rounded-full border border-umber/10 px-3 transition-colors focus-visible:outline-2 focus-visible:outline-clay",
            i % 5 === 1 ? "bg-forest text-ivory hover:bg-forest/90" : "bg-card hover:bg-ivory-deep",
          );
          const content = <span className="truncate text-sm font-semibold">{s.nom}</span>;
          return (
            <Link
              key={s.slug}
              to="/fa/$slug"
              params={{ slug: s.documentSlug ?? s.slug }}
              className={className}
              style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
            >
              {content}
            </Link>
          );
        })}
      </div>

      {liste.length === 0 && (
        <p className="py-10 text-center text-[14px] text-umber-soft">
          {`Aucun signe ne correspond à « ${q} ».`}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-umber-soft">
          256 signes répertoriés. Chaque signe dispose d’une fiche détaillée.
        </p>
        <Btn to="/contribuer" variant="outline">
          Proposer une contribution
        </Btn>
      </div>
    </Shell>
  );
}
