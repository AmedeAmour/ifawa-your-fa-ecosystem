import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import type { SignDocument } from "@/data/fa-signs";
import { Shell } from "./Shell";
import { ValidatedContributions } from "./ValidatedContributions";

export function SignDossier({ signe }: { signe: SignDocument }) {
  return (
    <Shell>
      <Link
        to="/fa"
        className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-umber-soft"
      >
        <ChevronLeft className="size-4" /> Les signes du Fa
      </Link>
      <article className="space-y-4">
        <header className="rounded-2xl bg-forest p-5 text-ivory sm:p-7">
          <p className="text-xs font-medium tracking-widest text-ivory/75">
            {signe.type === "messager" ? "LE MESSAGER" : "BIBLIOTHÈQUE DU FA"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{signe.nom}</h1>
          <p className="mt-4 text-sm leading-relaxed text-ivory/90">{signe.synthese}</p>
        </header>
        <p className="px-1 text-xs leading-relaxed text-umber-soft">
          Enseignements, symboles et obligations associés à ce signe dans la bibliothèque Ifawa.
        </p>
        <section aria-labelledby="profil-signe" className="carved bg-card p-5 sm:p-6">
          <h2 id="profil-signe" className="text-lg font-semibold">
            Profil général
          </h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-umber-soft">
            {signe.profil.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>
        <DossierSection title="Identité et correspondances">
          <dl className="divide-y divide-umber/10">
            {[
              ["Position", signe.position],
              ["Sexe symbolique", signe.sexeSymbolique],
              ["Maison / statut", signe.maison],
              ["Divinités", signe.divinites],
              ["Feuilles", signe.feuilles],
              ["Couleurs", signe.couleurs],
            ].map(([label, value]) => (
              <div key={label} className="py-3 first:pt-0">
                <dt className="text-xs font-medium text-umber-soft">{label}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        </DossierSection>
        <DossierSection title="Grandes devises et sens associés">
          <ol className="space-y-5">
            {signe.devises.map((devise) => (
              <li key={devise.ordre}>
                <h3 className="text-sm font-semibold leading-relaxed">
                  <span className="mr-2 text-clay">{devise.ordre}.</span>
                  {devise.titre}
                </h3>
                <p className="mt-2 text-sm leading-7 text-umber-soft">{devise.sens}</p>
              </li>
            ))}
          </ol>
        </DossierSection>
        <DossierSection title="Interdits">
          <CorpusList items={signe.interdits} />
        </DossierSection>
        <DossierSection title="Prescriptions et obligations">
          <CorpusList items={signe.prescriptions} />
        </DossierSection>
        <ValidatedContributions signSlug={signe.slug} />
      </article>
    </Shell>
  );
}

function DossierSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group carved bg-card">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-clay [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

function CorpusList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-4 text-sm leading-7 text-umber-soft marker:text-clay">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
