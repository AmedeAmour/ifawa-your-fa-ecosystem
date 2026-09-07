import { createFileRoute } from "@tanstack/react-router";
import { DossierPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/dossier")({
  component: DossierPage,
});
