import { createFileRoute } from "@tanstack/react-router";
import { RequestsPage } from "@/components/ifawa/RequestsPage";
export const Route = createFileRoute("/dossier")({ component: () => <RequestsPage mode="all" /> });
