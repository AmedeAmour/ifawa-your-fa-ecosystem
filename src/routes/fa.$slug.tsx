import { createFileRoute } from "@tanstack/react-router";
import { SigneDetailPage } from "@/components/ifawa/PrototypePages";

export const Route = createFileRoute("/fa/$slug")({
  component: RouteComponent,
});

function RouteComponent() {
  const { slug } = Route.useParams();
  return <SigneDetailPage slug={slug} />;
}
