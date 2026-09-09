"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="password" className="font-display text-sm font-bold text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          aria-describedby={state.error ? "login-error" : undefined}
          className="focus-brand mt-2 w-full rounded-xl border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors placeholder:text-ink-muted/70 hover:border-teal-300"
        />
      </div>

      {state.error && (
        <p id="login-error" role="alert" className="text-[13px] font-medium text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="focus-brand w-full rounded-full bg-brand-gradient px-6 py-3 font-display text-[15px] font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
