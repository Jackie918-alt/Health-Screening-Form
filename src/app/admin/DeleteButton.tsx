"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteResponse } from "./actions";

/**
 * Two-step delete: the button asks first, and only the second click submits.
 *
 * A one-click delete next to a response is the kind of thing that gets used by
 * accident. This is recoverable either way — the response goes to the bin —
 * but the pause is cheap and the confirmation says where it is going.
 */
export function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="focus-brand rounded-full border border-line px-5 py-2.5 font-display text-sm font-bold text-ink-soft transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
      >
        Delete response
      </button>
    );
  }

  return (
    <form action={deleteResponse} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <p className="text-sm text-ink-soft">
        Move this response to the bin? You can restore it later.
      </p>
      <Submit />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="focus-brand rounded-full px-4 py-2 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-deep-700 hover:underline"
      >
        Cancel
      </button>
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="focus-brand rounded-full bg-red-600 px-5 py-2.5 font-display text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Yes, move to bin"}
    </button>
  );
}
