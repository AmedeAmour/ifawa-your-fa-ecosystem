import { createFileRoute } from "@tanstack/react-router";
import { ServicesPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/services/")({
  component: ServicesPage,
});
