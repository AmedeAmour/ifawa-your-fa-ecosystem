import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Compass, Bookmark } from "lucide-react";
import { Shell } from "@/components/ifawa/Shell";
import { PostCard } from "@/components/ifawa/PostCard";
import { Btn, Empty, Kicker, Monogram, Panel, SectionTitle } from "@/components/ifawa/primitives";
import { actions, useApp } from "@/lib/store";
import {
  createRemotePost,
  loadFeedFromSupabase,
  readCachedFeed,
  uploadPostMedia,
} from "@/lib/ifawa-social";
import { decouverte } from "@/data/mock";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/hooks/use-refresh";

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
  const { posts, profil, currentUserId, hiddenPostIds, savedPostIds } = useApp();
  const [pageSize, setPageSize] = useState(20);
  const [feedError, setFeedError] = useState("");
  const [publishError, setPublishError] = useState("");
  const [texte, setTexte] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [filtre, setFiltre] = useState("Tout");
  const [type, setType] = useState<"Témoignage" | "Question" | "Contribution">("Témoignage");
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const filtres = ["Tout", "Témoignages", "Questions", "Enregistrés"];
  const types = ["Témoignage", "Question", "Contribution"] as const;

  const refreshFeed = useCallback(async () => {
    try {
      const remote = await loadFeedFromSupabase({ limit: pageSize });
      if (remote && actions.isCurrentUser(currentUserId))
        actions.remplacerPosts(remote.posts, remote.reactions);
      setFeedError("");
    } catch {
      setFeedError("Le fil n’a pas pu être actualisé. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoadingFeed(false);
    }
  }, [currentUserId, pageSize]);
  useRefresh(refreshFeed, 30000);

  useEffect(() => {
    const cached = readCachedFeed(currentUserId);
    if (cached) {
      actions.remplacerPosts(cached.posts, cached.reactions);
      setLoadingFeed(false);
    }
    void refreshFeed();
  }, [currentUserId, refreshFeed]);

  const visibles = posts
    .filter((p) => !hiddenPostIds.includes(p.id))
    .filter((p) =>
      filtre === "Tout"
        ? true
        : filtre === "Enregistrés"
          ? savedPostIds.includes(p.id)
          : filtre === "Témoignages"
            ? p.type === "Témoignage"
            : p.type === "Question",
    );

  return (
    <Shell>
      {!profil.initie && <DecouverteBloc />}
      {feedError && (
        <div role="alert" className="mb-4 rounded-xl bg-clay/10 p-4 text-sm text-clay">
          {feedError}{" "}
          <button className="min-h-11 font-semibold underline" onClick={() => void refreshFeed()}>
            Réessayer
          </button>
        </div>
      )}
      {filtre === "Enregistrés" && (
        <p className="mb-4 text-sm text-umber-soft">
          Vos publications enregistrées sur cet appareil, parmi les publications chargées.
        </p>
      )}

      <Panel className="mb-5 animate-rise">
        <div className="flex items-center gap-3 border-b border-umber/10 pb-3">
          <Monogram name={profil.pseudo} imageUrl={profil.avatarUrl} size={40} />
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="min-h-11 flex-1 rounded-full bg-ivory-deep/70 px-4 text-left text-[14px] text-umber-soft transition-colors hover:bg-ivory-deep"
          >
            Que souhaitez-vous partager ?
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3">
          {types.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setType(item);
                setComposerOpen(true);
              }}
              className={cn(
                "min-w-0 whitespace-nowrap rounded-full px-2 py-1 text-center text-[11px] font-medium leading-4 transition-colors",
                item === "Témoignage"
                  ? "bg-clay/10 text-clay hover:bg-clay/20"
                  : item === "Question"
                    ? "bg-forest/10 text-forest hover:bg-forest/20"
                    : "bg-brass/15 text-brass hover:bg-brass/25",
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {(composerOpen || texte || imageUrl) && (
          <div className="mt-4 animate-fade">
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder={
                type === "Question"
                  ? "Posez votre question à la communauté..."
                  : type === "Contribution"
                    ? "Partagez une contribution à faire vivre..."
                    : "Racontez votre témoignage..."
              }
              rows={4}
              autoFocus
              className="w-full resize-none rounded-2xl border border-umber/15 bg-ivory px-3 py-3 text-[15px] outline-none placeholder:text-umber-soft/70 focus:border-clay"
            />
            <div className="mt-3 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = () => setImageUrl(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-2 font-medium text-[13px] transition-colors",
                  imageUrl ? "bg-forest text-ivory" : "bg-card carved text-umber-soft",
                )}
              >
                <ImageIcon className="size-3.5" /> Photo
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl("");
                    setImageFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                  className="font-medium text-[13px] text-umber-soft hover:text-clay"
                >
                  Retirer
                </button>
              )}
              {!texte.trim() && !imageUrl && (
                <button
                  type="button"
                  onClick={() => setComposerOpen(false)}
                  className="font-medium text-[13px] text-umber-soft hover:text-clay"
                >
                  Annuler
                </button>
              )}
              <Btn
                onClick={async () => {
                  const content = texte;
                  const preview = imageUrl;
                  if (publishing) return;
                  setPublishError("");
                  setPublishing(true);
                  try {
                    const media = imageFile ? await uploadPostMedia(imageFile) : preview;
                    await createRemotePost(content, type, media);
                    setTexte("");
                    setImageUrl("");
                    setImageFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                    setComposerOpen(false);
                    await refreshFeed();
                  } catch {
                    setPublishError(
                      "Publication non envoyée. Votre texte est conservé : vous pouvez réessayer.",
                    );
                  } finally {
                    setPublishing(false);
                  }
                }}
                disabled={publishing || !texte.trim()}
                className="ml-auto"
              >
                {publishing ? "Publication..." : "Publier"}
              </Btn>
            </div>
            {publishError && (
              <p role="alert" className="mt-3 text-sm text-clay">
                {publishError}
              </p>
            )}
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="mt-3 aspect-[16/10] w-full rounded-2xl object-cover"
              />
            )}
          </div>
        )}
      </Panel>

      <div
        className="mb-4 flex items-center gap-1.5"
        role="group"
        aria-label="Filtrer les publications"
      >
        {filtres.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filtre === f}
            aria-label={f}
            title={f}
            onClick={() => setFiltre(f)}
            className={cn(
              "flex min-h-10 items-center justify-center rounded-full px-3 text-xs font-medium transition-colors",
              f === "Enregistrés" ? "ml-auto shrink-0" : "min-w-0",
              filtre === f
                ? "bg-umber text-ivory"
                : "bg-ivory-deep text-umber-soft hover:bg-ivory-deep/70",
            )}
          >
            {f === "Enregistrés" ? <Bookmark className="size-4" aria-hidden="true" /> : f}
          </button>
        ))}
      </div>

      {loadingFeed ? (
        <Empty titre="Chargement" texte="Ouverture du fil d'actualité." />
      ) : visibles.length ? (
        visibles.map((p, i) => <PostCard key={p.id} post={p} index={i} />)
      ) : (
        <Empty
          titre="Aucune publication"
          texte="Les publications de la communauté apparaîtront ici."
        />
      )}
      {posts.length >= pageSize && (
        <div className="mt-4 text-center">
          <Btn variant="outline" onClick={() => setPageSize((size) => size + 20)}>
            Voir plus de publications
          </Btn>
        </div>
      )}
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
            <p className="mt-2 font-display text-[18px] font-semibold leading-tight tracking-tight">
              {d.titre}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-umber-soft">{d.texte}</p>
          </div>
        ))}
      </div>
      <Link
        to="/services/$slug"
        params={{ slug: "initiation" }}
        className="mt-3 flex items-center justify-between rounded-2xl bg-clay px-5 py-4 text-ivory transition-colors hover:bg-clay/90"
      >
        <span className="font-display text-[20px] font-semibold leading-tight tracking-tight">
          Demander une initiation
        </span>
        <Compass className="size-5" />
      </Link>
    </section>
  );
}
