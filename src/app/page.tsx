import { SurveyShell } from "@/components/SurveyShell";
import { isAdmin } from "@/lib/admin-session";
import { periodPhase } from "@/lib/survey-period";

export default async function Page() {
  // A signed-in admin always sees the live form, so the survey can be checked
  // over before it opens and after it closes.
  const preview = process.env.SURVEY_IGNORE_PERIOD === "1" || (await isAdmin());
  const phase = preview ? "open" : periodPhase();

  // Rendered on the server so the footer year never causes a hydration mismatch.
  return <SurveyShell year={new Date().getFullYear()} phase={phase} />;
}
