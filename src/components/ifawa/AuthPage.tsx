import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Logo, Btn, Field, Panel, inputCls } from "./primitives";
import { changeRecoveredPassword, requestPasswordReset, signInWithEmail } from "@/lib/ifawa-auth";

export function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "forgot" | "recovery">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("recovery") === "1") setMode("recovery");
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setStatus("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        await requestPasswordReset(email);
        setStatus(
          "Si un compte correspond à cette adresse, un lien de récupération vous sera envoyé. Consultez aussi vos courriers indésirables.",
        );
      } else if (mode === "recovery") {
        if (password.length < 8 || password !== confirmation)
          throw new Error("Mots de passe différents.");
        await changeRecoveredPassword(password);
        setPassword("");
        setConfirmation("");
        setMode("login");
        window.history.replaceState(null, "", "/connexion");
        setStatus("Votre mot de passe a été mis à jour. Vous pouvez vous connecter.");
      } else {
        await signInWithEmail(email, password);
        await navigate({ to: "/accueil" });
      }
    } catch {
      setError(
        mode === "recovery"
          ? "Vérifiez que les mots de passe sont identiques (8 caractères minimum) et que le lien reçu est encore valide."
          : mode === "forgot"
            ? "Le lien n’a pas pu être envoyé. Vérifiez votre connexion puis réessayez."
            : "Connexion impossible. Vérifiez votre email, votre mot de passe et la confirmation de votre adresse.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-dvh bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-5">
          <Link to="/" aria-label="Accueil IFAWA">
            <Logo />
          </Link>
          <Link to="/" className="flex min-h-11 items-center gap-2 text-sm">
            <ArrowLeft className="size-4" /> Accueil
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 py-10 sm:py-16">
        <p className="mb-3 text-sm font-medium text-clay">Votre espace IFAWA</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {mode === "login"
            ? "Heureux de vous retrouver."
            : mode === "forgot"
              ? "Retrouver votre compte"
              : "Nouveau mot de passe"}
        </h1>
        <p className="mb-7 mt-3 text-base leading-relaxed text-umber-soft">
          {mode === "login"
            ? "Reprenez vos échanges et votre parcours avec la communauté."
            : mode === "forgot"
              ? "Recevez un lien sécurisé à l’adresse de votre compte."
              : "Choisissez un mot de passe d’au moins 8 caractères."}
        </p>
        <Panel>
          <form onSubmit={submit} className="space-y-5">
            {mode !== "recovery" && (
              <Field label="Adresse email">
                <input
                  required
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  autoComplete="email"
                />
              </Field>
            )}
            {mode !== "forgot" && (
              <Field label="Mot de passe">
                <div className="relative">
                  <input
                    required
                    className={`${inputCls} pr-12`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={visible ? "text" : "password"}
                    minLength={mode === "recovery" ? 8 : 6}
                    autoComplete={mode === "recovery" ? "new-password" : "current-password"}
                  />
                  <button
                    type="button"
                    aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setVisible(!visible)}
                    className="absolute right-0 top-0 grid size-11 place-items-center"
                  >
                    {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            )}
            {mode === "recovery" && (
              <Field label="Confirmer le mot de passe">
                <input
                  required
                  className={inputCls}
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  type="password"
                  minLength={8}
                  autoComplete="new-password"
                />
              </Field>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-clay/10 p-3 text-sm text-clay">
                {error}
              </p>
            )}
            {status && (
              <p role="status" className="rounded-xl bg-forest/10 p-3 text-sm text-forest">
                {status}
              </p>
            )}
            <Btn type="submit" full disabled={loading}>
              {loading
                ? "Veuillez patienter…"
                : mode === "login"
                  ? "Se connecter"
                  : mode === "forgot"
                    ? "Recevoir le lien"
                    : "Enregistrer le mot de passe"}
            </Btn>
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "forgot" : "login");
                setError("");
                setStatus("");
              }}
              className="min-h-11 w-full text-sm font-medium text-clay"
            >
              {mode === "login" ? "Mot de passe oublié ?" : "Revenir à la connexion"}
            </button>
          </form>
        </Panel>
        <p className="mt-7 text-center text-sm text-umber-soft">
          Nouveau sur IFAWA ?{" "}
          <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-clay">
            Créer mon espace →
          </Link>
        </p>
      </main>
    </div>
  );
}
