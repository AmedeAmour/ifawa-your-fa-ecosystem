import { createFileRoute } from "@tanstack/react-router";
import { MessagesPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/messages")({
  validateSearch: (search: Record<string, unknown>): { conversation?: string; peer?: string } => ({
    ...(typeof search["conversation"] === "string" ? { conversation: search["conversation"] } : {}),
    ...(typeof search["peer"] === "string" ? { peer: search["peer"] } : {}),
  }),
  component: MessagesPage,
});
