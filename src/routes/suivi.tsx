import { createFileRoute } from "@tanstack/react-router";
import { SuiviPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/suivi")({
  component: SuiviPage,
});
