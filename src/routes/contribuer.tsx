import { createFileRoute } from "@tanstack/react-router";
import { ContribuerPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/contribuer")({
  component: ContribuerPage,
});
