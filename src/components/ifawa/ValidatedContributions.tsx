import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { loadApprovedContributions, type ApprovedContribution } from "@/lib/ifawa-contributions";
import { Kicker, Panel } from "./primitives";

export function ValidatedContributions({ signSlug }: { signSlug: string }) {
  const [items, setItems] = useState<ApprovedContribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadApprovedContributions(signSlug)
      .then((contributions) => {
        if (active) setItems(contributions);
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [signSlug]);

  if (loading || !items.length) return null;
  return (
    <section aria-labelledby="contributions-validees" className="space-y-3">
      <div>
        <Kicker>Communauté</Kicker>
        <h2 id="contributions-validees" className="mt-2 text-xl font-semibold">
          Contributions validées
        </h2>
        <p className="mt-1 text-sm text-umber-soft">
          Ces contenus communautaires ont été relus par l’équipe IFAWA et restent distincts du
          corpus officiel.
        </p>
      </div>
      {items.map((item) => (
        <Panel key={item.id}>
          <div className="flex flex-wrap items-center gap-2 text-xs text-clay">
            <BadgeCheck className="size-4" aria-hidden="true" />
            <span>Validée par l’équipe IFAWA</span>
            <span aria-hidden="true">·</span>
            <span>{item.categoryLabel}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{item.body}</p>
          <p className="mt-3 text-xs text-umber-soft">
            {item.authorName}
            {item.publishedAt ? ` · ${new Date(item.publishedAt).toLocaleDateString("fr-FR")}` : ""}
          </p>
        </Panel>
      ))}
    </section>
  );
}
