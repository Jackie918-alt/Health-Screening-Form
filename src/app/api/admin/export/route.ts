import { isAdmin } from "@/lib/admin-session";
import { getResponseStore } from "@/lib/responses";
import { toCsv } from "@/lib/responses/csv";

/**
 * CSV of every response.
 *
 * Checks the session itself rather than trusting the Proxy — this handler sits
 * under `/api`, which the Proxy matcher does not cover, and it hands out the
 * entire dataset in one request.
 */
export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return new Response("Unauthorised", { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim().toLowerCase();
  const language = url.searchParams.get("lang");

  let rows = await getResponseStore().all();
  if (language === "en" || language === "ms") {
    rows = rows.filter((row) => row.language === language);
  }
  if (search) {
    rows = rows.filter((row) => JSON.stringify(row.answers).toLowerCase().includes(search));
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="wekongsi-survey-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
