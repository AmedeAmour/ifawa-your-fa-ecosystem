import { Link } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import type { SignCatalogItem } from "@/data/fa-signs";
import { Shell } from "./Shell";
import { ValidatedContributions } from "./ValidatedContributions";

export function BasicSignPage({ sign }: { sign: SignCatalogItem }) {
  return (
    <Shell>
      <Link
        to="/fa"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-umber-soft"
      >
        <ChevronLeft className="size-4" /> Les signes du Fa
      </Link>
      <article className="space-y-6">
        <header className="rounded-2xl bg-forest p-5 text-ivory sm:p-7">
          <p className="text-xs font-medium tracking-widest text-ivory/75">BIBLIOTHÈQUE DU FA</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{sign.nom}</h1>
        </header>
        <p className="text-sm leading-relaxed text-umber-soft">
          Le signe est répertorié. Sa fiche traditionnelle détaillée sera ajoutée à partir des
          documents validés par IFAWA.
        </p>
        <ValidatedContributions signSlug={sign.slug} />
      </article>
    </Shell>
  );
}
