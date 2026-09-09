import Image from "next/image";
import Link from "next/link";
import { logout } from "./login/actions";

/** Shared header for every admin screen. */
export function AdminHeader({ driver, note }: { driver: string; note: string }) {
  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
        <Link href="/admin" className="focus-brand flex items-center gap-3 rounded-lg">
          <Image
            src="/brand/wekongsi-wordmark.png"
            alt="We Kongsi"
            width={216}
            height={36}
            className="h-5 w-auto"
          />
          <span className="h-5 w-px bg-line" aria-hidden />
          <span className="font-display text-sm font-bold text-ink">Survey admin</span>
        </Link>

        <span
          title={note}
          className={[
            "rounded-full px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-wide",
            driver === "supabase" ? "bg-teal-50 text-teal-700" : "bg-amber-100 text-amber-800",
          ].join(" ")}
        >
          {driver === "supabase" ? "Supabase" : driver === "file" ? "Local file" : "Not connected"}
        </span>

        <form action={logout} className="ml-auto">
          <button
            type="submit"
            className="focus-brand rounded-full border border-line px-4 py-2 font-display text-sm font-bold text-ink-soft transition-colors hover:border-teal-400 hover:bg-teal-50"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
