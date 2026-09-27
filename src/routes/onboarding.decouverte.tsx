import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/ifawa/OnboardingPage";
export const Route = createFileRoute("/onboarding/decouverte")({
  component: () => <OnboardingPage initiated={false} />,
});
