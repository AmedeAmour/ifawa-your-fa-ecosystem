import { useEffect, useState, type FormEvent } from "react";
import { actions, useApp } from "@/lib/store";
import {
  loadCurrentProfile,
  updateFaDetails,
  updateProfileSettings,
  uploadProfileAvatar,
} from "@/lib/ifawa-auth";
import { supabase } from "@/lib/supabase";
import { signes } from "@/data/mock";
import { Shell } from "./Shell";
import { Btn, Field, Monogram, PageTitle, Panel, inputCls } from "./primitives";

export function ProfileSettings() {
  const { profil, hiddenPostIds } = useApp();
  const [draft, setDraft] = useState(profil);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [privacyReady, setPrivacyReady] = useState(false);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(profil);
  }, [profil, editing]);
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    let alive = true;
    void supabase?.rpc("ifawa_security_version").then(({ data, error }) => {
      if (alive) setPrivacyReady(!error && data === 1);
    });
    return () => {
      alive = false;
    };
  }, []);
  function patch(value: Partial<typeof draft>) {
    setEditing(true);
    setDraft((d) => ({ ...d, ...value }));
    setStatus("");
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const avatarUrl = file ? await uploadProfileAvatar(file) : draft.avatarUrl;
      await updateFaDetails(draft);
      await updateProfileSettings({ ...draft, avatarUrl });
      const saved = await loadCurrentProfile();
      if (!saved) throw new Error("Profil indisponible.");
      actions.majProfil(saved);
      setEditing(false);
      setFile(null);
      setStatus("Vos modifications sont enregistrées.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "La sauvegarde n’a pas abouti. Vos modifications sont conservées dans le formulaire.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <PageTitle kicker="Votre compte">Profil et confidentialité</PageTitle>
      <form onSubmit={save} className="space-y-5">
        <Panel>
          <h2 className="mb-5 text-lg font-semibold">Votre présentation</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Pseudonyme">
              <input
                required
                minLength={2}
                maxLength={40}
                className={inputCls}
                value={draft.pseudo}
                onChange={(e) => patch({ pseudo: e.target.value })}
              />
            </Field>
            <Field label="Photo de profil">
              <div className="flex items-center gap-3">
                <Monogram name={draft.pseudo} imageUrl={preview || draft.avatarUrl} size={48} />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="min-w-0 w-full text-sm"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setEditing(true);
                  }}
                />
              </div>
            </Field>
            <div className="sm:col-span-2">
              <Field label="À propos de vous">
                <textarea
                  className={inputCls}
                  maxLength={3000}
                  rows={4}
                  value={draft.temoignage}
                  onChange={(e) => patch({ temoignage: e.target.value })}
                  placeholder="Quelques mots sur votre parcours…"
                />
              </Field>
            </div>
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-5 text-lg font-semibold">Votre parcours Fa</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Parcours">
              <select
                className={inputCls}
                value={draft.initie ? "initiated" : "discovery"}
                onChange={(e) => patch({ initie: e.target.value === "initiated" })}
              >
                <option value="discovery">Je découvre le Fa</option>
                <option value="initiated">Je suis initié(e)</option>
              </select>
            </Field>
            {draft.initie && (
              <>
                <Field
                  label="Signe reçu"
                  hint="Choisissez une suggestion ou écrivez le nom de votre signe."
                >
                  <input
                    list="profile-signs"
                    maxLength={120}
                    className={inputCls}
                    value={draft.signe}
                    onChange={(e) => patch({ signe: e.target.value })}
                  />
                </Field>
                <datalist id="profile-signs">
                  {signes.map((s) => (
                    <option key={s.slug} value={s.nom} />
                  ))}
                </datalist>
                <Field label="Année d’initiation (facultatif)">
                  <input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear()}
                    className={inputCls}
                    value={draft.annee}
                    onChange={(e) => patch({ annee: e.target.value })}
                  />
                </Field>
                <Field label="Votre ressenti (facultatif)">
                  <select
                    className={inputCls}
                    value={draft.satisfaction}
                    onChange={(e) => patch({ satisfaction: e.target.value })}
                  >
                    <option value="">Non renseigné</option>
                    {[
                      "Très insatisfait",
                      "Insatisfait",
                      "Mitigé",
                      "Satisfait",
                      "Très satisfait",
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
              </>
            )}
          </div>
        </Panel>
        <Panel>
          <h2 className="mb-5 text-lg font-semibold">Vos préférences</h2>
          <Field label="Visibilité du signe">
            <select
              disabled={!privacyReady}
              className={inputCls}
              value={draft.signVisibility}
              onChange={(e) =>
                patch({ signVisibility: e.target.value as typeof draft.signVisibility })
              }
            >
              <option value="private">Moi uniquement</option>
              <option value="connections">Mes connexions</option>
              <option value="same_sign">Membres du même signe</option>
            </select>
          </Field>
          {!privacyReady && (
            <p className="mt-2 text-sm text-clay">
              Le contrôle de visibilité n’est pas encore disponible. Ce choix ne constitue pas une
              garantie de confidentialité.
            </p>
          )}
          <label className="mt-5 flex min-h-12 items-center justify-between gap-4 rounded-xl bg-ivory-deep/50 p-4">
            <span>
              <span className="block font-medium">Recevoir des demandes de connexion</span>
              <span className="mt-1 block text-sm text-umber-soft">
                Vos connexions existantes sont conservées.
              </span>
            </span>
            <input
              type="checkbox"
              className="size-5 accent-clay"
              checked={draft.miseEnRelation}
              onChange={(e) => patch({ miseEnRelation: e.target.checked })}
            />
          </label>
          {hiddenPostIds.length > 0 && (
            <button
              type="button"
              onClick={actions.restoreHiddenPosts}
              className="mt-3 min-h-11 text-sm font-medium text-clay"
            >
              Réafficher les {hiddenPostIds.length} publications masquées sur cet appareil
            </button>
          )}
        </Panel>
        {error && (
          <p role="alert" className="rounded-xl bg-clay/10 p-4 text-sm text-clay">
            {error}
          </p>
        )}
        {status && (
          <p role="status" className="rounded-xl bg-forest/10 p-4 text-sm text-forest">
            {status}
          </p>
        )}
        <Btn type="submit" disabled={busy} full>
          {busy ? "Enregistrement…" : "Enregistrer mes modifications"}
        </Btn>
      </form>
    </Shell>
  );
}
