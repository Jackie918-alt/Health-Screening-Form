"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { getResponseStore } from "@/lib/responses";

/**
 * Moving responses to and from the bin.
 *
 * Both re-check the session. Next's guidance is to treat a Server Action like
 * a public endpoint — it is reachable by anything that can POST, and the Proxy
 * does not cover it.
 */

export async function deleteResponse(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getResponseStore().softDelete(id);

  revalidatePath("/admin");
  revalidatePath("/admin/bin");
  redirect("/admin?deleted=1");
}

export async function restoreResponse(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await getResponseStore().restore(id);

  revalidatePath("/admin");
  revalidatePath("/admin/bin");
  redirect("/admin/bin?restored=1");
}
