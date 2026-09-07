import { useState } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Monogram } from "./primitives";
import { actions, useApp } from "@/lib/store";
import type { Post } from "@/data/mock";
import tray from "@/assets/tray.jpg";
import { cn } from "@/lib/utils";

export function PostCard({ post, index = 0 }: { post: Post; index?: number }) {
  const { reactions } = useApp();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [menu, setMenu] = useState(false);
  const officiel = post.type === "Officiel";
  const actif = !!reactions[post.id];

  return (
    <article
      className={cn(
        "mb-4 animate-rise p-4 sm:p-5",
        officiel ? "bg-umber text-ivory" : "bg-card carved",
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 50}ms` }}
    >
      <div className="mb-3 flex items-center gap-3">
        <Monogram name={post.auteur} size={40} tone={officiel ? "clay" : undefined} />
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
            className={cn("grid size-8 place-items-center", officiel ? "text-ivory/60" : "text-umber-soft")}
            aria-label="Options de la publication"
          >
            <MoreHorizontal className="size-4" />
          </button>
          {menu && (
            <div className="absolute right-0 top-9 z-10 w-44 animate-fade bg-card text-umber carved">
              {["Enregistrer", "Masquer", "Signaler"].map((o) => (
                <button
                  key={o}
                  onClick={() => setMenu(false)}
                  className="block w-full px-3 py-2.5 text-left text-[13px] hover:bg-ivory-deep"
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className={cn("text-[14px] leading-relaxed", officiel ? "text-ivory/85" : "text-umber-soft")}>
        {post.contenu}
      </p>

      {post.image && (
        <img
          src={tray}
          alt="Plateau de divination gravé, contenu de démonstration"
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
        <Action
          label={`Réagir${post.reactions ? ` · ${post.reactions}` : ""}`}
          icon={Heart}
          onClick={() => actions.reagir(post.id)}
          active={actif}
          officiel={officiel}
        />
        <Action
          label={`Commenter${post.commentaires.length ? ` · ${post.commentaires.length}` : ""}`}
          icon={MessageCircle}
          onClick={() => setOuvert((o) => !o)}
          officiel={officiel}
        />
        <Action label="Partager" icon={Share2} onClick={() => {}} officiel={officiel} />
      </div>

      {ouvert && (
        <div className={cn("mt-3 animate-fade space-y-3 border-t pt-3", officiel ? "border-ivory/15" : "border-umber/10")}>
          {post.commentaires.map((c) => (
            <div key={c.id} className="flex gap-2.5">
              <Monogram name={c.auteur} size={28} />
              <div className={cn("flex-1 px-3 py-2", officiel ? "bg-ivory/10" : "bg-ivory-deep/60")}>
                <p className="text-[12px] font-semibold">
                  {c.auteur} <span className="font-normal opacity-50">· {c.heure}</span>
                </p>
                <p className="mt-0.5 text-[13px] leading-relaxed opacity-85">{c.texte}</p>
              </div>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actions.commenter(post.id, texte);
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
  onClick,
  active,
  officiel,
}: {
  label: string;
  icon: typeof Heart;
  onClick: () => void;
  active?: boolean;
  officiel?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors",
        active ? "text-clay" : officiel ? "text-ivory/60 hover:text-ivory" : "text-umber-soft hover:text-clay",
      )}
    >
      <Icon className={cn("size-3.5", active && "fill-clay")} />
      {label}
    </button>
  );
}
