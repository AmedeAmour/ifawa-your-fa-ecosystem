import { useState, type FormEvent } from "react";
import {
  Bookmark,
  Check,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  ThumbsUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Btn, Field, Monogram, inputCls } from "./primitives";
import { actions, useApp, type ReactionKind } from "@/lib/store";
import type { Post } from "@/data/mock";
import {
  createRemoteComment,
  deleteRemoteComment,
  deleteRemotePost,
  loadFeedFromSupabase,
  setRemoteReaction,
  shareRemotePost,
  updateRemotePost,
  reportRemotePost,
} from "@/lib/ifawa-social";

export function PostCard({ post }: { post: Post; index?: number | undefined }) {
  const { reactions, savedPostIds, currentUserId, posts } = useApp();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [modal, setModal] = useState<"edit" | "share" | "report" | "image" | "delete" | null>(null);
  const [text, setText] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reason, setReason] = useState("Contenu inapproprié");
  const reaction = reactions[post.id];
  const saved = savedPostIds.includes(post.id);
  async function perform(action: () => Promise<unknown>, done?: () => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      done?.();
      try {
        const remote = await loadFeedFromSupabase({ limit: Math.max(20, posts.length) });
        if (remote && actions.isCurrentUser(currentUserId))
          actions.remplacerPosts(remote.posts, remote.reactions);
      } catch {
        setNotice("Enregistré. Le fil sera actualisé dès que la connexion sera rétablie.");
      }
    } catch {
      setError("L’action n’a pas pu être enregistrée. Réessayez ; votre texte est conservé.");
    } finally {
      setBusy(false);
    }
  }
  function open(next: typeof modal) {
    setText(next === "edit" ? post.contenu : "");
    setError("");
    setModal(next);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (modal === "edit")
      void perform(
        () => updateRemotePost(post, text.trim()),
        () => setModal(null),
      );
    if (modal === "share")
      void perform(
        () => shareRemotePost(post, text.trim()),
        () => {
          setModal(null);
          setNotice("Publication partagée.");
        },
      );
    if (modal === "report")
      void perform(
        () => reportRemotePost(post.id, reason, text),
        () => {
          setModal(null);
          setNotice("Signalement transmis à la modération.");
        },
      );
  }
  const labels: Record<ReactionKind, string> = {
    like: "J’aime",
    love: "J’adore",
    laugh: "Rire",
    support: "Soutien",
  };
  return (
    <article
      id={`post-${post.id}`}
      className="mb-4 scroll-mt-20 rounded-2xl border border-umber/10 bg-card p-4 sm:p-5"
    >
      <header className="mb-3 flex items-center gap-3">
        <Monogram name={post.auteur} imageUrl={post.authorAvatarUrl} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold">{post.auteur}</p>
          <p className="mt-0.5 text-[13px] text-umber-soft">
            {post.type} · {post.heure}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Options de la publication"
            className="grid size-11 place-items-center rounded-full hover:bg-ivory-deep"
          >
            <MoreHorizontal className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                actions.toggleSavedPost(post.id);
                setNotice(
                  saved
                    ? "Publication retirée des enregistrements."
                    : "Publication enregistrée sur cet appareil.",
                );
              }}
            >
              <Bookmark className="size-4" />{" "}
              {saved ? "Retirer des enregistrements" : "Enregistrer sur cet appareil"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.hidePost(post.id)}>
              Masquer sur cet appareil
            </DropdownMenuItem>
            {post.canEdit ? (
              <>
                <DropdownMenuItem onSelect={() => open("edit")}>Modifier</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => open("delete")} className="text-clay">
                  Supprimer
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => open("report")}>
                <Flag className="size-4" /> Signaler
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <p className="whitespace-pre-wrap break-words text-[16px] leading-relaxed">{post.contenu}</p>
      {post.mediaUrl && (
        <button
          type="button"
          className="mt-4 block w-full overflow-hidden rounded-xl"
          aria-label="Agrandir la photo"
          onClick={() => open("image")}
        >
          <img
            src={post.mediaUrl}
            alt="Photo jointe à la publication"
            loading="lazy"
            className="max-h-[520px] w-full object-cover"
          />
        </button>
      )}
      {(post.reactions > 0 || post.commentaires.length > 0 || saved) && (
        <div className="mt-3 flex items-center gap-2 text-[13px] text-umber-soft">
          {post.reactions > 0 && (
            <span className="flex items-center gap-1">
              <Heart className="size-4 text-clay" /> {post.reactions}
            </span>
          )}
          {saved && <Bookmark className="size-4 text-clay" aria-label="Enregistrée" />}
          <button className="ml-auto min-h-9" onClick={() => setCommentsOpen(!commentsOpen)}>
            {post.commentaires.length > 0
              ? `${post.commentaires.length} commentaire${post.commentaires.length > 1 ? "s" : ""}`
              : ""}
          </button>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-1 border-t border-umber/10 pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            className={`flex min-h-11 flex-wrap items-center justify-center gap-1 rounded-lg px-1 text-[13px] font-medium hover:bg-ivory-deep ${reaction ? "text-clay" : "text-umber-soft"}`}
          >
            <ThumbsUp className="size-4" /> {reaction ? labels[reaction] : "J’aime"}
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {(Object.keys(labels) as ReactionKind[]).map((kind) => (
              <DropdownMenuItem
                key={kind}
                onSelect={() => void perform(() => setRemoteReaction(post.id, kind, reaction))}
              >
                {reaction === kind && <Check className="size-4" />}
                {labels[kind]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="flex min-h-11 flex-wrap items-center justify-center gap-1 rounded-lg px-1 text-[13px] font-medium text-umber-soft hover:bg-ivory-deep"
          aria-expanded={commentsOpen}
          onClick={() => setCommentsOpen(!commentsOpen)}
        >
          <MessageCircle className="size-4" /> Commenter
        </button>
        <button
          className="flex min-h-11 flex-wrap items-center justify-center gap-1 rounded-lg px-1 text-[13px] font-medium text-umber-soft hover:bg-ivory-deep"
          onClick={() => open("share")}
        >
          <Share2 className="size-4" /> Partager
        </button>
      </div>
      {notice && (
        <p role="status" className="mt-3 text-sm text-forest">
          {notice}
        </p>
      )}
      {error && !modal && (
        <p role="alert" className="mt-3 text-sm text-clay">
          {error}
        </p>
      )}
      {commentsOpen && (
        <section className="mt-4 space-y-3 border-t border-umber/10 pt-4" aria-label="Commentaires">
          {post.commentaires.map((item) => (
            <div key={item.id} className="flex gap-2">
              <Monogram name={item.auteur} imageUrl={item.authorAvatarUrl} size={32} />
              <div className="min-w-0 flex-1 rounded-xl bg-ivory-deep/50 p-3">
                <p className="text-sm font-semibold">{item.auteur}</p>
                <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                  {item.texte}
                </p>
                <div className="mt-1 flex items-center justify-between text-xs text-umber-soft">
                  <span>{item.heure}</span>
                  {item.canDelete && (
                    <button
                      disabled={busy}
                      className="min-h-9 px-2 text-clay"
                      onClick={() => void perform(() => deleteRemoteComment(post.id, item.id))}
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (comment.trim())
                void perform(
                  () => createRemoteComment(post.id, comment.trim()),
                  () => setComment(""),
                );
            }}
            className="flex flex-col gap-2"
          >
            <label className="sr-only" htmlFor={`comment-${post.id}`}>
              Votre commentaire
            </label>
            <textarea
              id={`comment-${post.id}`}
              className={inputCls}
              rows={2}
              maxLength={5000}
              placeholder="Écrire un commentaire…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div className="flex justify-end">
              <Btn type="submit" disabled={busy || !comment.trim()}>
                {busy ? "Envoi…" : "Envoyer"}
              </Btn>
            </div>
          </form>
        </section>
      )}
      <Dialog
        open={modal !== null}
        onOpenChange={(value) => {
          if (!value && !busy) setModal(null);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>
            {modal === "edit"
              ? "Modifier la publication"
              : modal === "share"
                ? "Partager à la communauté"
                : modal === "report"
                  ? "Signaler une publication"
                  : modal === "delete"
                    ? "Supprimer votre publication ?"
                    : "Photo de la publication"}
          </DialogTitle>
          <DialogDescription>
            {modal === "report"
              ? "Expliquez ce qui doit être examiné par la modération."
              : modal === "delete"
                ? "La publication et ses commentaires seront supprimés. Cette action est définitive."
                : modal === "image"
                  ? `Photo publiée par ${post.auteur}`
                  : "Prenez un instant pour relire votre message."}
          </DialogDescription>
          {modal === "image" ? (
            <img
              src={post.mediaUrl}
              alt="Photo de la publication"
              className="max-h-[70dvh] w-full object-contain"
            />
          ) : modal === "delete" ? (
            <div className="flex justify-end gap-2">
              <Btn variant="quiet" onClick={() => setModal(null)} disabled={busy}>
                Annuler
              </Btn>
              <Btn
                onClick={() =>
                  void perform(
                    () => deleteRemotePost(post.id),
                    () => {
                      actions.supprimerPublication(post.id);
                      setModal(null);
                    },
                  )
                }
                disabled={busy}
              >
                Supprimer
              </Btn>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {modal === "report" && (
                <Field label="Motif">
                  <select
                    className={inputCls}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  >
                    {[
                      "Contenu inapproprié",
                      "Harcèlement",
                      "Spam ou arnaque",
                      "Information trompeuse",
                      "Autre",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label={modal === "report" ? "Précisions (facultatif)" : "Votre message"}>
                <textarea
                  className={inputCls}
                  rows={5}
                  maxLength={10000}
                  required={modal === "edit"}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                />
              </Field>
              <Btn full type="submit" disabled={busy}>
                {busy
                  ? "Enregistrement…"
                  : modal === "report"
                    ? "Transmettre le signalement"
                    : modal === "share"
                      ? "Partager"
                      : "Enregistrer"}
              </Btn>
            </form>
          )}
          {error && (
            <p role="alert" className="text-sm text-clay">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </article>
  );
}
