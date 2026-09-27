import { supabase } from "./supabase";

export const AUDIO_MAX_BYTES = 10 * 1024 * 1024;
export function audioFormat(file: File) {
  const type = file.type.split(";")[0] || "";
  const extension = (
    {
      "audio/webm": "webm",
      "audio/mp4": "m4a",
      "audio/ogg": "ogg",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/aac": "aac",
    } as Record<string, string>
  )[type];
  if (!extension || !file.size || file.size > AUDIO_MAX_BYTES)
    throw new Error("Choisissez un audio MP3, M4A, WebM, OGG ou WAV de moins de 10 Mo.");
  return { type, extension };
}
export async function uploadServiceAudio(userId: string, file: File) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const { type, extension } = audioFormat(file);
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("service-audio")
    .upload(path, file, { contentType: type, upsert: false });
  if (error)
    throw new Error("L’audio n’a pas pu être envoyé. Réessayez avant d’envoyer votre demande.");
  return path;
}
export async function serviceAudioUrl(path: string) {
  if (!supabase) throw new Error("Connexion indisponible.");
  const { data, error } = await supabase.storage.from("service-audio").createSignedUrl(path, 900);
  if (error || !data?.signedUrl) throw new Error("Cet audio n’est pas disponible pour le moment.");
  return data.signedUrl;
}
