import { services as fallbackServices } from "@/data/mock";
import { readCache, writeCache } from "./ifawa-cache";
import { supabase } from "./supabase";
import { uploadServiceAudio } from "./service-audio";

const serviceTypeToSlug: Record<string, string> = {
  fa_consultation: "consultation",
  initiation_request: "initiation",
  sign_deep_study: "etude",
  fa_accompaniment: "accompagnement",
};

const serviceSlugToType: Record<string, string> = {
  consultation: "fa_consultation",
  initiation: "initiation_request",
  etude: "sign_deep_study",
  accompagnement: "fa_accompaniment",
};

type ServiceCatalogRow = {
  type: string;
  title: string;
  description: string;
  display_order: number;
};

export type ServiceCard = (typeof fallbackServices)[number];

export type ServiceRequest = {
  id: string;
  serviceType: string;
  serviceSlug: string;
  formulaName: string | null;
  subject: string;
  deadline: string | null;
  details: string | null;
  audioPath?: string | null;
  status: string;
  createdAt: string;
  resultSummary: string | null;
};

export async function fetchServiceCatalog(): Promise<ServiceCard[]> {
  if (!supabase) return fallbackServices;

  const { data, error } = await supabase
    .from("service_catalog")
    .select("type,title,description,display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data?.length) return fallbackServices;

  const services = (data as ServiceCatalogRow[])
    .map((service) => ({
      slug: serviceTypeToSlug[service.type] ?? service.type,
      titre: service.title,
      icone:
        fallbackServices.find((item) => item.slug === serviceTypeToSlug[service.type])?.icone ??
        "briefcase",
      description: service.description,
    }))
    .filter((service) => Boolean(service.slug));
  writeCache("global", "services", services);
  return services;
}

export function readCachedServiceCatalog() {
  return readCache<ServiceCard[]>("global", "services", fallbackServices);
}

export async function createServiceRequest({
  serviceSlug,
  formulaName,
  subject,
  deadline,
  details,
  audio,
}: {
  serviceSlug: string;
  formulaName: string;
  subject: string;
  deadline: string;
  details: string;
  audio?: File | null;
}) {
  if (!supabase) throw new Error("La connexion à la plateforme n'est pas configurée.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Connectez-vous pour envoyer une demande.");

  const serviceType = serviceSlugToType[serviceSlug];
  if (!serviceType) throw new Error("Service inconnu.");
  if (!subject.trim() && !audio)
    throw new Error("Écrivez votre préoccupation ou ajoutez un audio.");
  const audioPath = audio ? await uploadServiceAudio(user.id, audio) : null;
  const { data, error } = await supabase
    .from("service_requests")
    .insert({
      requester_id: user.id,
      service_type: serviceType,
      subject: subject.trim() || "Demande vocale",
      request_details: {
        formule: formulaName,
        delai: deadline || null,
        details: details || null,
        audio_path: audioPath,
      },
      status: "submitted",
      submitted_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    if (audioPath)
      await supabase.storage
        .from("service-audio")
        .remove([audioPath])
        .catch(() => {});
    throw error;
  }
  return data?.id as string;
}

export async function loadMyServiceRequests(): Promise<ServiceRequest[]> {
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("service_requests")
    .select(
      "id,service_type,subject,priority,request_details,status,created_at,submitted_at,result_summary",
    )
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!data) return [];

  const requests = data.map((request) => ({
    id: request.id,
    serviceType: request.service_type,
    serviceSlug: serviceTypeToSlug[request.service_type] ?? request.service_type,
    formulaName:
      typeof request.request_details === "object" && request.request_details !== null
        ? String((request.request_details as Record<string, unknown>)["formule"] ?? "")
        : null,
    subject: request.subject,
    deadline:
      typeof request.request_details === "object" && request.request_details !== null
        ? String(
            (request.request_details as Record<string, unknown>)["delai"] ?? request.priority ?? "",
          )
        : request.priority,
    details:
      typeof request.request_details === "object" && request.request_details !== null
        ? String((request.request_details as Record<string, unknown>)["details"] ?? "")
        : null,
    status: request.status,
    audioPath:
      typeof request.request_details === "object" && request.request_details !== null
        ? String((request.request_details as Record<string, unknown>)["audio_path"] ?? "") || null
        : null,
    createdAt: request.submitted_at ?? request.created_at,
    resultSummary: request.result_summary,
  }));
  writeCache(user.id, "service-requests", requests);
  return requests;
}

export function readCachedServiceRequests(userId?: string): ServiceRequest[] {
  return readCache<ServiceRequest[]>(userId, "service-requests", []);
}
