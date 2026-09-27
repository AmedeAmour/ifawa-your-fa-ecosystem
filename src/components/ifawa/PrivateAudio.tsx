import { useEffect, useState } from "react";
import { serviceAudioUrl } from "@/lib/service-audio";
export function PrivateAudio({ path }: { path: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setUrl("");
    setError(false);
    serviceAudioUrl(path)
      .then((value) => {
        if (alive) setUrl(value);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [path, retry]);
  return (
    <div className="mt-4 rounded-2xl bg-forest/5 p-4">
      <p className="mb-2 text-sm font-semibold">Votre message vocal</p>
      {url && !error ? (
        <audio
          controls
          preload="metadata"
          src={url}
          aria-label="Écouter le message de votre demande"
          className="w-full"
          onError={() => setError(true)}
        />
      ) : error ? (
        <button
          className="min-h-11 text-sm text-clay underline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Audio indisponible · Réessayer
        </button>
      ) : (
        <p role="status" className="text-sm">
          Chargement de l’audio…
        </p>
      )}
    </div>
  );
}
