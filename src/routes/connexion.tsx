import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo, Btn, Field, inputCls } from "@/components/ifawa/primitives";
import { signInWithEmail } from "@/lib/ifawa-auth";

export const Route = createFileRoute("/connexion")({
  component: Connexion,
});

function Connexion() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError("");
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      navigate({ to: "/accueil" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible pour le moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-5">
          <Logo />
          <span className="label-mono text-umber-soft">Connexion</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-10">
        <div className="animate-rise">
          <p className="label-mono mb-3 text-clay">Compte Ifawa</p>
          <h1 className="font-display text-[34px] uppercase leading-[0.95] tracking-tight sm:text-[42px]">
            Reprendre votre parcours
          </h1>
          <p className="mb-7 mt-3 max-w-[46ch] text-[14px] leading-relaxed text-umber-soft">
            Connectez-vous avec l'adresse email et le mot de passe utilisés à la fin du parcours.
          </p>
          <div className="space-y-4">
            <Field label="Adresse email">
              <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
            </Field>
            <Field label="Mot de passe">
              <input className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
            </Field>
            {error && <p className="bg-clay/10 px-3 py-2 text-[13px] text-clay">{error}</p>}
            <Btn onClick={submit} disabled={loading || !email.trim() || password.length < 6}>
              {loading ? "Connexion..." : "Se connecter"}
            </Btn>
          </div>
          <div className="mt-8 border-t border-umber/10 pt-5">
            <p className="text-[13px] leading-relaxed text-umber-soft">
              Vous n'avez pas encore créé de compte ?
            </p>
            <Link
              to="/"
              className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-clay transition-colors hover:text-umber"
            >
              Commencer le parcours Ifawa →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
