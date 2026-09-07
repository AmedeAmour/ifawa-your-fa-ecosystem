import { createFileRoute } from "@tanstack/react-router";
import { ParametresPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/parametres")({
  component: ParametresPage,
});
