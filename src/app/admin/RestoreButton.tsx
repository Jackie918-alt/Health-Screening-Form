"use client";

import { useFormStatus } from "react-dom";
import { restoreResponse } from "./actions";

/** Single click — restoring is not destructive, so it needs no confirmation. */
export function RestoreButton({ id }: { id: string }) {
  return (
    <form action={restoreResponse}>
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-brand rounded-full border border-line px-4 py-2 font-display text-sm font-bold text-teal-700 transition-colors hover:border-teal-400 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Restoring…" : "Restore"}
    </button>
  );
}
