import { createFileRoute } from "@tanstack/react-router";
import { AdminModerationPage } from "@/components/ifawa/AdminModerationPage";

export const Route = createFileRoute("/admin")({
  component: AdminModerationPage,
});
