import { createFileRoute } from "@tanstack/react-router";
import { CarnetPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/carnet")({
  component: CarnetPage,
});
