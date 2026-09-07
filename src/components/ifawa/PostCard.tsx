import { useState, type ReactNode } from "react";
import {
  HandHeart,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Smile,
  ThumbsUp,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Monogram } from "./primitives";
import { actions, useApp } from "@/lib/store";
import type { ReactionKind } from "@/lib/store";
import type { Post } from "@/data/mock";
import {
  createRemoteComment,
  deleteRemoteComment,
  deleteRemotePost,
  loadFeedFromSupabase,
  setRemoteReaction,
  shareRemotePost,
  updateRemotePost,
} from "@/lib/ifawa-social";
import tray from "@/assets/tray.jpg";
import { cn } from "@/lib/utils";

const reactionOptions: { key: ReactionKind; label: string; icon: LucideIcon; tone: string }[] = [
  { key: "like", label: "J'aime", icon: ThumbsUp, tone: "bg-clay text-ivory" },
  { key: "love", label: "J'adore", icon: Heart, tone: "bg-[#b8322d] text-ivory" },
  { key: "laugh", label: "Rire", icon: Smile, tone: "bg-brass text-umber" },
  { key: "support", label: "Soutien", icon: HandHeart, tone: "bg-forest text-ivory" },
];

export function PostCard({ post, index = 0 }: { post: Post; index?: number }) {
  const { reactions, profil } = useApp();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [menu, setMenu] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.contenu);
  const officiel = post.type === "Officiel";
  const reaction = reactions[post.id];
  const activeReaction = reactionOptions.find((option) => option.key === reaction);

  async function refreshFeed() {
    try {
      const remote = await loadFeedFromSupabase();
      if (remote) actions.remplacerPosts(remote.posts, remote.reactions);
    } catch {
      // Keep the local optimistic state when the network is unavailable.
    }
  }

  return (
    <article
      className={cn(
        "mb-4 animate-rise p-4 sm:p-5",
        officiel ? "bg-umber text-ivory" : "bg-card carved",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <Monogram
          name={post.auteur}
          imageUrl={post.authorAvatarUrl}
          size={40}
          tone={officiel ? "clay" : undefined}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold leading-tight">{post.auteur}</p>
          <p className={cn("label-mono mt-1", officiel ? "text-ivory/60" : "text-umber-soft")}>
            {post.signe ? `${post.signe} · ` : ""}
            {post.type} · {post.heure}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenu((m) => !m)}
            className={cn(
              "grid size-8 place-items-center",
              officiel ? "text-ivory/60" : "text-umber-soft",
            )}
            aria-label="Options de la publication"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-10 w-44 animate-fade bg-card text-umber carved">
              {post.canEdit ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(true);
                      setMenu(false);
                    }}
                    className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-ivory-deep"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={async () => {
                      actions.supprimerPublication(post.id);
                      setMenu(false);
                      try {
                        await deleteRemotePost(post.id);
                        await refreshFeed();
                      } catch {
                        await refreshFeed();
                      }
                    }}
                    className="block w-full px-3 py-2.5 text-left text-[13px] text-clay hover:bg-ivory-deep"
                  >
                    Supprimer
                  </button>
                </>
              ) : (
                ["Enregistrer", "Masquer", "Signaler"].map((o) => (
                  <button
                    key={o}
                    onClick={() => setMenu(false)}
                    className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-ivory-deep"
                  >
                    {o}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            const next = editText.trim();
            if (!next) return;
            actions.modifierPublication(post.id, next);
            setEditing(false);
            try {
              await updateRemotePost(post, next);
              await refreshFeed();
            } catch {
              await refreshFeed();
            }
          }}
          className="space-y-2"
        >
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
            rows={3}
            className="w-full resize-none border border-umber/15 bg-ivory px-3 py-2 text-[13px] outline-none focus:border-clay"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-umber-soft"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-clay px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ivory"
            >
              Enregistrer
            </button>
          </div>
        </form>
      ) : (
        <p
          className={cn(
            "whitespace-pre-line text-[14px] leading-relaxed",
            officiel ? "text-ivory/85" : "text-umber-soft",
          )}
        >
          {post.contenu}
        </p>
      )}

      {post.image && (
        <img
          src={post.mediaUrl ?? tray}
          alt=""
          loading="lazy"
          width={1280}
          height={800}
          className="mt-3 aspect-[16/10] w-full object-cover"
        />
      )}

      <div
        className={cn(
          "mt-4 flex items-center gap-1 border-t pt-2",
          officiel ? "border-ivory/15" : "border-umber/10",
        )}
      >
        <div className="relative flex flex-1">
          <Action
            label={`${activeReaction ? activeReaction.label : "Réagir"}${post.reactions ? ` · ${post.reactions}` : ""}`}
            icon={Heart}
            customIcon={
              activeReaction ? <ReactionBadge reaction={activeReaction} size="sm" /> : undefined
            }
            onClick={() => setReactionOpen((open) => !open)}
            active={!!activeReaction}
            officiel={officiel}
          />
          {reactionOpen && (
            <div className="fixed bottom-24 left-4 right-4 z-50 grid grid-cols-2 gap-1 bg-card p-2 text-umber shadow-lg carved sm:absolute sm:bottom-10 sm:left-0 sm:right-auto sm:flex sm:min-w-max sm:p-1">
              {reactionOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    actions.reagir(post.id, option.key);
                    void setRemoteReaction(post.id, option.key, reaction)
                      .then(refreshFeed)
                      .catch(refreshFeed);
                    setReactionOpen(false);
                  }}
                  className="flex items-center justify-center gap-2 px-2.5 py-2 text-[12px] transition-colors hover:bg-ivory-deep sm:justify-start"
                >
                  <ReactionBadge reaction={option} size="md" />
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <Action
          label={`Commenter${post.commentaires.length ? ` · ${post.commentaires.length}` : ""}`}
          icon={MessageCircle}
          onClick={() => setOuvert((o) => !o)}
          officiel={officiel}
        />
        <Action
          label="Partager"
          icon={Share2}
          onClick={() => setShareOpen((open) => !open)}
          officiel={officiel}
        />
      </div>

      {shareOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            actions.partager(post.id, shareNote);
            void shareRemotePost(post, shareNote).then(refreshFeed).catch(refreshFeed);
            setShareNote("");
            setShareOpen(false);
          }}
          className={cn(
            "mt-3 animate-fade space-y-2 border-t pt-3",
            officiel ? "border-ivory/15" : "border-umber/10",
          )}
        >
          <textarea
            value={shareNote}
            onChange={(e) => setShareNote(e.target.value)}
            rows={2}
            placeholder="Ajouter un mot avant de partager…"
            className={cn(
              "w-full resize-none border px-3 py-2 text-[13px] outline-none",
              officiel
                ? "border-ivory/20 bg-transparent placeholder:text-ivory/40"
                : "border-umber/15 bg-ivory placeholder:text-umber-soft/50 focus:border-clay",
            )}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-clay px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ivory"
            >
              Partager
            </button>
          </div>
        </form>
      )}

      {ouvert && (
        <div
          className={cn(
            "mt-3 animate-fade space-y-3 border-t pt-3",
            officiel ? "border-ivory/15" : "border-umber/10",
          )}
        >
          {post.commentaires.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Monogram name={c.auteur} imageUrl={c.authorAvatarUrl} size={28} />
              <div
                className={cn("flex-1 px-3 py-2", officiel ? "bg-ivory/10" : "bg-ivory-deep/60")}
              >
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-[12px] font-semibold">
                    {c.auteur} <span className="font-normal opacity-50">· {c.heure}</span>
                  </p>
                  {(c.canDelete || c.auteur === profil.pseudo) && (
                    <button
                      type="button"
                      onClick={() => {
                        actions.supprimerCommentaire(post.id, c.id);
                        void deleteRemoteComment(post.id, c.id)
                          .then(refreshFeed)
                          .catch(refreshFeed);
                      }}
                      className="text-umber-soft opacity-70 transition-opacity hover:opacity-100"
                      aria-label="Supprimer le commentaire"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed opacity-85">{c.texte}</p>
              </div>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.commenter(post.id, texte);
              void createRemoteComment(post.id, texte).then(refreshFeed).catch(refreshFeed);
              setTexte("");
            }}
            className="flex gap-2"
          >
            <input
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Écrire un commentaire…"
              className={cn(
                "flex-1 border px-3 py-2 text-[13px] outline-none",
                officiel
                  ? "border-ivory/20 bg-transparent placeholder:text-ivory/40"
                  : "border-umber/15 bg-ivory placeholder:text-umber-soft/50 focus:border-clay",
              )}
            />
            <button
              type="submit"
              className="bg-clay px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ivory"
            >
              Envoyer
            </button>
          </form>
        </div>
      )}
    </article>
  );
}

function Action({
  label,
  icon: Icon,
  customIcon,
  onClick,
  active,
  officiel,
}: {
  label: string;
  icon: typeof Heart;
  customIcon?: ReactNode;
  onClick: () => void;
  active?: boolean;
  officiel?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
        active
          ? "text-clay"
          : officiel
            ? "text-ivory/60 hover:text-ivory"
            : "text-umber-soft hover:text-clay",
      )}
    >
      {customIcon ?? <Icon className={cn("size-3.5", active && "fill-clay")} />}
      {label}
    </button>
  );
}

function ReactionBadge({
  reaction,
  size,
}: {
  reaction: (typeof reactionOptions)[number];
  size: "sm" | "md";
}) {
  const Icon = reaction.icon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid shrink-0 place-items-center rounded-full font-display leading-none",
        reaction.tone,
        size === "sm" ? "size-4 text-[11px]" : "size-7 text-[17px]",
      )}
    >
      <Icon
        className={cn(
          size === "sm" ? "size-2.5" : "size-4",
          reaction.key === "love" && "fill-current",
        )}
      />
    </span>
  );
}
