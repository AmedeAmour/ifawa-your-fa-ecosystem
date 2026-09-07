import { createFileRoute } from "@tanstack/react-router";
import { RecherchePage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/recherche")({
  component: RecherchePage,
});
