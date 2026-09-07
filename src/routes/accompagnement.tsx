import { createFileRoute } from "@tanstack/react-router";
import { AccompagnementPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/accompagnement")({
  component: AccompagnementPage,
});
