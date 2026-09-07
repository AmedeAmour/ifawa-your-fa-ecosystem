import { services as fallbackServices } from "@/data/mock";
import { supabase } from "./supabase";

const serviceTypeToSlug: Record<string, string> = {
  fa_consultation: "consultation",
  initiation_request: "initiation",
  sign_deep_study: "etude",
  fa_accompaniment: "accompagnement",
};

type ServiceCatalogRow = {
  type: string;
  title: string;
  description: string;
  display_order: number;
};

export type ServiceCard = (typeof fallbackServices)[number];

export async function fetchServiceCatalog(): Promise<ServiceCard[]> {
  if (!supabase) return fallbackServices;

  const { data, error } = await supabase
    .from("service_catalog")
    .select("type,title,description,display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  if (error || !data?.length) return fallbackServices;

  return (data as ServiceCatalogRow[])
    .map((service) => ({
      slug: serviceTypeToSlug[service.type] ?? service.type,
      titre: service.title,
      icone: fallbackServices.find((item) => item.slug === serviceTypeToSlug[service.type])?.icone ?? "briefcase",
      description: service.description,
    }))
    .filter((service) => Boolean(service.slug));
}
