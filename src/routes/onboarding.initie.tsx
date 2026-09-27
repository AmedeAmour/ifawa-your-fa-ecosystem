import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "@/components/ifawa/OnboardingPage";
export const Route = createFileRoute("/onboarding/initie")({
  component: () => <OnboardingPage initiated={true} />,
});
