import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});
