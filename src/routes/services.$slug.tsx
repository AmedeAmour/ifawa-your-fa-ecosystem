import { createFileRoute } from "@tanstack/react-router";
import { ServiceDetailPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/services/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <ServiceDetailPage slug={slug} />;
}
