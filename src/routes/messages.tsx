import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/messages")({
  component: MessagesPage,
});
