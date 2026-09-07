import { createFileRoute } from "@tanstack/react-router";
import { ReseauPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/reseau")({
  component: ReseauPage,
});
