import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Upload } from "lucide-react";
import { audioFormat, AUDIO_MAX_BYTES } from "@/lib/service-audio";

export function AudioRecorder({
  file,
  onChange,
  onRecordingChange,
  disabled = false,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
  onRecordingChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "asking" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearInterval(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);
  useEffect(() => {
    if (!file) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }
  async function start() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("L’enregistrement n’est pas disponible ici. Vous pouvez joindre un fichier audio.");
      return;
    }
    setPhase("asking");
    onRecordingChange(true);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) {
        media.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = media;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      );
      const recording = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
      recorder.current = recording;
      const chunks: Blob[] = [];
      let size = 0;
      let failed = false;
      recording.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          size += event.data.size;
        }
        if (size > AUDIO_MAX_BYTES) {
          failed = true;
          stop();
        }
      };
      recording.onerror = () => {
        failed = true;
        stop();
      };
      recording.onstop = () => {
        if (timer.current) clearInterval(timer.current);
        media.getTracks().forEach((track) => track.stop());
        if (!mounted.current) return;
        setPhase("idle");
        onRecordingChange(false);
        if (failed) {
          setError("L’enregistrement a été interrompu. Recommencez avec un message plus court.");
          return;
        }
        try {
          const type = recording.mimeType.split(";")[0] || "audio/webm";
          const blob = new Blob(chunks, { type });
          const temp = new File([blob], "message", { type });
          const { extension } = audioFormat(temp);
          onChange(new File([blob], `message-vocal.${extension}`, { type }));
        } catch (issue) {
          setError(issue instanceof Error ? issue.message : "Enregistrement indisponible.");
        }
      };
      recording.start(1000);
      setSeconds(0);
      setPhase("recording");
      const started = Date.now();
      timer.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - started) / 1000);
        setSeconds(elapsed);
        if (elapsed >= 180) stop();
      }, 250);
    } catch {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (mounted.current) {
        setPhase("idle");
        onRecordingChange(false);
        setError(
          "Le microphone n’est pas accessible. Autorisez-le dans votre navigateur ou joignez un audio.",
        );
      }
    }
  }
  return (
    <div className="rounded-2xl border border-forest/15 bg-forest/5 p-4">
      <p className="font-semibold">Vous préférez parler ?</p>
      <p className="mt-1 text-sm leading-relaxed text-umber-soft">
        Racontez votre préoccupation avec votre voix. Écoutez votre message avant de l’envoyer.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled || phase === "asking"}
          onClick={phase === "recording" ? stop : () => void start()}
          className="inline-flex min-h-12 items-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-ivory disabled:opacity-50"
        >
          {phase === "recording" ? <Square className="size-4" /> : <Mic className="size-5" />}
          {phase === "asking"
            ? "Autorisez le microphone…"
            : phase === "recording"
              ? "Terminer l’enregistrement"
              : file
                ? "Réenregistrer"
                : "Enregistrer un audio"}
        </button>
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full px-3 text-sm font-medium text-forest">
          <Upload className="size-4" /> Joindre un audio
          <input
            aria-label="Joindre un fichier audio"
            className="sr-only"
            type="file"
            accept="audio/*"
            disabled={disabled || phase !== "idle"}
            onChange={(event) => {
              const selected = event.target.files?.[0];
              event.target.value = "";
              if (!selected) return;
              try {
                audioFormat(selected);
                setError("");
                onChange(selected);
              } catch (issue) {
                setError(issue instanceof Error ? issue.message : "Fichier invalide.");
              }
            }}
          />
        </label>
      </div>
      {phase === "recording" && (
        <p role="status" className="mt-3 text-sm font-semibold text-clay">
          ● Enregistrement · {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")} /
          3:00
        </p>
      )}
      {url && (
        <div className="mt-3 flex items-center gap-2">
          <audio
            controls
            src={url}
            className="min-w-0 flex-1"
            aria-label="Réécouter votre message"
          />
          <button
            type="button"
            aria-label="Supprimer cet audio"
            disabled={disabled || phase !== "idle"}
            onClick={() => onChange(null)}
            className="grid size-11 shrink-0 place-items-center rounded-full text-clay"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      )}
      <p className="mt-2 text-xs text-umber-soft">
        Enregistrement : 3 minutes maximum. Fichier : 10 Mo maximum. Audio privé, joint à votre
        demande uniquement après envoi.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-clay">
          {error}
        </p>
      )}
    </div>
  );
}
