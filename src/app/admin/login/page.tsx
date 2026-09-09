import Image from "next/image";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin sign in — We Kongsi Survey" };

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  // Already signed in? Skip the form.
  if (await isAdmin()) redirect("/admin");

  const { next } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 shadow-card">
        <Image
          src="/brand/wekongsi-wordmark.png"
          alt="We Kongsi"
          width={216}
          height={36}
          className="h-6 w-auto"
        />
        <h1 className="mt-6 font-display text-xl font-extrabold tracking-tight text-ink">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          Survey responses are restricted to the People &amp; Agency Development team.
        </p>
        <LoginForm next={typeof next === "string" ? next : "/admin"} />
      </div>
      <p className="mt-6 text-xs text-ink-muted">
        Filling in the survey does not require an account.
      </p>
    </div>
  );
}
