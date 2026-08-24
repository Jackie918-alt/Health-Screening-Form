import { SurveyShell } from "@/components/SurveyShell";

export default function Page() {
  // Rendered on the server so the footer year never causes a hydration mismatch.
  return <SurveyShell year={new Date().getFullYear()} />;
}
