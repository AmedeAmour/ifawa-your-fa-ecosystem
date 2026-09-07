import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});
