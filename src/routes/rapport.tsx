import { createFileRoute } from "@tanstack/react-router";
import { RapportPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/rapport")({
  component: RapportPage,
});
