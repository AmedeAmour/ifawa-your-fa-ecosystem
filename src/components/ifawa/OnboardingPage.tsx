import { Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { signUpWithOnboarding } from "@/lib/ifawa-auth";
import { actions } from "@/lib/store";
import { signes } from "@/data/mock";
import { Btn, Field, Logo, Panel, inputCls } from "./primitives";

export function OnboardingPage({ initiated }: { initiated: boolean }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sign, setSign] = useState("");
  const [year, setYear] = useState("");
  const [satisfaction, setSatisfaction] = useState("");
  const [about, setAbout] = useState("");
  const [relation, setRelation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(false);
  const accountStep = initiated ? 2 : 0;
  const satisfactionOptions = [
    "Très insatisfait",
    "Insatisfait",
    "Mitigé",
    "Satisfait",
    "Très satisfait",
  ];
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (initiated && (step === 0 || step === 2)) {
      const initiationYear = Number(year);
      if (
        !sign.trim() ||
        sign.trim().length > 120 ||
        !year ||
        !Number.isInteger(initiationYear) ||
        initiationYear < 1900 ||
        initiationYear > new Date().getFullYear()
      ) {
        setStep(0);
        setError(
          "Sélectionnez ou écrivez votre signe et renseignez une année d’initiation valide.",
        );
        return;
      }
    }
    if (initiated && step >= 1 && (!satisfactionOptions.includes(satisfaction) || !about.trim())) {
      setStep(1);
      setError("Sélectionnez votre satisfaction et ajoutez quelques mots sur vous.");
      return;
    }
    if (step === accountStep && pseudo.trim().length < 2) {
      setError("Choisissez un pseudonyme d’au moins deux caractères.");
      return;
    }
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    if (busy) return;
    setBusy(true);
    const draft = {
      pseudo: pseudo.trim(),
      initie: initiated,
      signe: sign.trim(),
      annee: year,
      temoignage: about.trim(),
      satisfaction,
      miseEnRelation: relation,
      signVisibility: "private" as const,
    };
    try {
      const result = await signUpWithOnboarding(email, password, draft);
      setPassword("");
      if (result.status === "signed-in") {
        actions.setCurrentUserId(result.user.id);
        actions.majProfil(draft);
        await navigate({ to: "/accueil" });
      } else setConfirmation(true);
    } catch {
      setError(
        "Votre compte n’a pas pu être finalisé. Si vous avez déjà reçu un email de confirmation, confirmez votre adresse puis connectez-vous. Sinon, vérifiez vos informations et réessayez.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-dvh bg-ivory text-umber">
      <header className="border-b border-umber/10">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between px-5">
          <Link to="/" aria-label="Accueil IFAWA">
            <Logo />
          </Link>
          <Link
            to="/connexion"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-clay"
          >
            Se connecter
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-10">
        <p className="mb-3 text-sm font-medium text-clay">
          {initiated ? "Parcours initié" : "Parcours découverte"} · Étape {step + 1} sur 3
        </p>
        <div className="mb-7 flex gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full ${i <= step ? "bg-clay" : "bg-ivory-deep"}`}
            />
          ))}
        </div>
        {confirmation ? (
          <Panel>
            <h1 className="text-2xl font-semibold">Confirmez votre adresse email</h1>
            <p className="mt-4 leading-relaxed text-umber-soft">
              Consultez votre boîte de réception et ouvrez le lien de confirmation, puis revenez
              vous connecter. Pensez à vérifier les courriers indésirables.
            </p>
            <Btn to="/connexion" className="mt-5" full>
              Aller à la connexion
            </Btn>
          </Panel>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <h1 className="text-3xl font-semibold tracking-tight">
              {initiated
                ? ["Votre initiation.", "Votre expérience.", "Créons votre compte."][step]
                : step === 0
                  ? "Créons votre espace."
                  : step === 1
                    ? "Votre parcours, à votre rythme."
                    : "Bienvenue dans la communauté."}
            </h1>
            <p className="text-base leading-relaxed text-umber-soft">
              {initiated
                ? [
                    "Renseignez votre signe Fa et votre année d’initiation pour commencer.",
                    "Choisissez votre niveau de satisfaction et présentez-vous en quelques mots. Tous les champs sont obligatoires.",
                    "Dernière étape : choisissez vos identifiants pour rejoindre IFAWA.",
                  ][step]
                : step === 0
                  ? "Un pseudonyme suffit pour vous présenter à la communauté."
                  : step === 1
                    ? "Ces informations sont facultatives. Vous pourrez compléter votre profil plus tard."
                    : "Vérifiez vos informations avant de créer votre compte."}
            </p>
            <Panel>
              <div className="space-y-5">
                {step === accountStep && (
                  <>
                    <Field label="Pseudonyme">
                      <input
                        required
                        minLength={2}
                        maxLength={40}
                        autoComplete="nickname"
                        className={inputCls}
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value)}
                      />
                    </Field>
                    <Field label="Adresse email">
                      <input
                        required
                        type="email"
                        autoComplete="email"
                        className={inputCls}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </Field>
                    <Field label="Mot de passe" hint="8 caractères minimum">
                      <input
                        required
                        minLength={8}
                        type="password"
                        autoComplete="new-password"
                        className={inputCls}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                  </>
                )}
                {((initiated && step === 0) || (!initiated && step === 1)) && (
                  <>
                    {initiated && (
                      <>
                        <Field
                          label="Signe reçu"
                          hint="Choisissez une suggestion ou écrivez le nom de votre signe."
                        >
                          <input
                            required
                            list="onboarding-signs"
                            maxLength={120}
                            autoComplete="off"
                            placeholder="Sélectionnez ou écrivez votre signe"
                            className={inputCls}
                            value={sign}
                            onChange={(e) => setSign(e.target.value)}
                          />
                        </Field>
                        <datalist id="onboarding-signs">
                          {signes.map((s) => (
                            <option key={s.slug} value={s.nom} />
                          ))}
                        </datalist>
                        <Field label="Année d’initiation">
                          <input
                            required
                            className={inputCls}
                            type="number"
                            min={1900}
                            max={new Date().getFullYear()}
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                          />
                        </Field>
                      </>
                    )}
                    {!initiated && (
                      <Field label="Quelques mots sur vous (facultatif)">
                        <textarea
                          rows={4}
                          maxLength={3000}
                          className={inputCls}
                          value={about}
                          onChange={(e) => setAbout(e.target.value)}
                        />
                      </Field>
                    )}
                    {!initiated && (
                      <p className="text-sm text-umber-soft">
                        Vous pourrez ajouter une photo depuis votre profil.
                      </p>
                    )}
                  </>
                )}
                {initiated && step === 1 && (
                  <>
                    <fieldset>
                      <legend className="mb-3 text-sm font-semibold">
                        Votre satisfaction depuis l’initiation
                      </legend>
                      <div className="grid gap-2">
                        {satisfactionOptions.map((option) => (
                          <label
                            key={option}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-3 ${satisfaction === option ? "border-clay bg-clay/10" : "border-umber/15"}`}
                          >
                            <input
                              type="radio"
                              name="satisfaction"
                              required
                              value={option}
                              checked={satisfaction === option}
                              onChange={(e) => setSatisfaction(e.target.value)}
                              className="size-5 accent-clay"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <Field
                      label="Quelques mots sur vous"
                      hint="Présentez votre parcours et votre expérience en quelques phrases."
                    >
                      <textarea
                        required
                        rows={4}
                        maxLength={3000}
                        className={inputCls}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                      />
                    </Field>
                  </>
                )}
                {step === 2 && (
                  <>
                    {!initiated && (
                      <dl className="space-y-3 text-sm">
                        <div>
                          <dt className="text-umber-soft">Pseudonyme</dt>
                          <dd className="mt-1 font-semibold">{pseudo}</dd>
                        </div>
                        <div>
                          <dt className="text-umber-soft">Email</dt>
                          <dd className="mt-1 break-all">{email}</dd>
                        </div>
                        {initiated && (
                          <div>
                            <dt className="text-umber-soft">Signe</dt>
                            <dd className="mt-1">{sign || "Non renseigné"}</dd>
                          </div>
                        )}
                      </dl>
                    )}
                    <label className="flex min-h-12 items-center gap-3 rounded-xl bg-ivory-deep/50 p-4">
                      <input
                        className="size-5 shrink-0 accent-clay"
                        type="checkbox"
                        checked={relation}
                        onChange={(e) => setRelation(e.target.checked)}
                      />
                      <span className="text-sm leading-relaxed">
                        Je souhaite recevoir des demandes de connexion de la communauté.
                      </span>
                    </label>
                  </>
                )}
              </div>
            </Panel>
            {error && (
              <p role="alert" className="rounded-xl bg-clay/10 p-4 text-sm text-clay">
                {error}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              {step > 0 ? (
                <Btn
                  variant="ghost"
                  disabled={busy}
                  onClick={() => {
                    setError("");
                    setStep(step - 1);
                  }}
                >
                  Retour
                </Btn>
              ) : (
                <Link to="/" className="inline-flex min-h-11 items-center text-sm">
                  Retour
                </Link>
              )}
              <Btn type="submit" disabled={busy}>
                {busy ? "Création…" : step === 2 ? "Créer mon compte" : "Continuer"}
              </Btn>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
