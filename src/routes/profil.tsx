import { createFileRoute } from "@tanstack/react-router";
import { ProfilPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/profil")({
  component: ProfilPage,
});
