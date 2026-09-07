import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Compass } from "lucide-react";
import { Shell } from "@/components/ifawa/Shell";
import { PostCard } from "@/components/ifawa/PostCard";
import { Btn, Kicker, Monogram, Panel, SectionTitle } from "@/components/ifawa/primitives";
import { actions, useApp } from "@/lib/store";
import { createRemotePost, loadFeedFromSupabase } from "@/lib/ifawa-social";
import { decouverte } from "@/data/mock";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/accueil")({
  head: () => ({
    meta: [
      { title: "Fil d'actualité — IFAWA" },
      {
        name: "description",
        content: "Publications, témoignages et annonces de la communauté Ifawa autour du Fa.",
      },
      { property: "og:title", content: "Fil d'actualité — IFAWA" },
      {
        property: "og:description",
        content: "Suivez la communauté Ifawa : publications, témoignages et contenus pédagogiques.",
      },
    ],
  }),
  component: Accueil,
});

function Accueil() {
  const { posts, profil } = useApp();
  const [texte, setTexte] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [filtre, setFiltre] = useState("Tout");
  const [type, setType] = useState<"Témoignage" | "Question" | "Contribution">("Témoignage");
  const fileRef = useRef<HTMLInputElement>(null);
  const filtres = ["Tout", "Membres", "Officiel", "Témoignages"];
  const types = ["Témoignage", "Question", "Contribution"] as const;

  async function refreshFeed() {
    try {
      const remote = await loadFeedFromSupabase();
      if (remote) actions.remplacerPosts(remote.posts, remote.reactions);
    } catch {
      // The local feed remains available if the remote feed is temporarily unreachable.
    }
  }

  useEffect(() => {
    void refreshFeed();
  }, []);

  const visibles = posts.filter((p) =>
    filtre === "Tout"
      ? true
      : filtre === "Officiel"
        ? p.type === "Officiel" || p.type === "Pédagogie"
        : filtre === "Témoignages"
          ? p.type === "Témoignage"
          : p.auteur.startsWith("@"),
  );

  return (
    <Shell>
      {!profil.initie && <DecouverteBloc />}

      <Panel tone="deep" className="mb-5 animate-rise">
        <div className="flex items-start gap-3">
          <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={40} />
          <div className="flex-1">
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Que souhaitez-vous partager ?"
              rows={2}
              className="w-full resize-none border-0 bg-transparent text-[15px] outline-none placeholder:text-umber-soft"
            />
            <div className="mt-3">
              <div className="grid grid-cols-3 gap-2">
                {types.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setType(item)}
                    className={cn(
                      "min-w-0 whitespace-nowrap px-2 py-1.5 text-center font-mono text-[8.5px] uppercase tracking-[0.08em] transition-colors sm:text-[9px] sm:tracking-[0.14em]",
                      type === item ? "bg-umber text-ivory" : "bg-card carved text-umber-soft",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => setImageUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "inline-flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
                  imageUrl ? "bg-forest text-ivory" : "bg-card carved text-umber-soft",
                )}
              >
                <ImageIcon className="size-3.5" /> Photo
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="font-mono text-[10px] uppercase tracking-[0.16em] text-umber-soft hover:text-clay"
                >
                  Retirer
                </button>
              )}
              <Btn
                onClick={async () => {
                  const content = texte;
                  const media = imageUrl;
                  actions.publier(content, media, type);
                  setTexte("");
                  setImageUrl("");
                  try {
                    await createRemotePost(content, type, media);
                    await refreshFeed();
                  } catch {
                    // Keep the optimistic local publication visible.
                  }
                }}
                disabled={!texte.trim()}
                className="ml-auto"
              >
                Publier
              </Btn>
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="" className="mt-3 aspect-[16/10] w-full object-cover" />
            )}
          </div>
        </div>
      </Panel>

      <div className="mb-4 flex flex-wrap gap-2">
        {filtres.map((f) => (
          <button
            key={f}
            onClick={() => setFiltre(f)}
            className={cn(
              "px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors",
              filtre === f
                ? "bg-umber text-ivory"
                : "bg-ivory-deep text-umber-soft hover:bg-ivory-deep/70",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {visibles.map((p, i) => (
        <PostCard key={p.id} post={p} index={i} />
      ))}
    </Shell>
  );
}

function DecouverteBloc() {
  return (
    <section className="mb-6 animate-rise">
      <SectionTitle aside="Non initié(e)">Découvrir le Fa</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2">
        {decouverte.map((d, i) => (
          <div
            key={d.titre}
            className="bg-card carved p-4"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Kicker>{String(i + 1).padStart(2, "0")}</Kicker>
            <p className="mt-2 font-display text-[18px] uppercase leading-tight">{d.titre}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-umber-soft">{d.texte}</p>
          </div>
        ))}
      </div>
      <Link
        to="/services/initiation"
        className="mt-3 flex items-center justify-between bg-clay px-5 py-4 text-ivory transition-colors hover:bg-clay/90"
      >
        <span className="font-display text-[20px] uppercase leading-none">
          Demander une initiation
        </span>
        <Compass className="size-5" />
      </Link>
    </section>
  );
}
