"use client";

import Image from "next/image";
import { UI } from "@/lib/i18n";
import { LanguageProvider, useLanguage } from "./LanguageProvider";
import { LanguageToggle } from "./LanguageToggle";
import { SurveyForm } from "./SurveyForm";

export function SurveyShell({ year }: { year: number }) {
  return (
    <LanguageProvider>
      <BrandHeader />
      <main className="flex-1">
        <SurveyForm />
      </main>
      <BrandFooter year={year} />
    </LanguageProvider>
  );
}

function BrandHeader() {
  const { tr } = useLanguage();
  return (
    <header className="sticky top-0 z-30 bg-brand-gradient shadow-[0_1px_16px_rgba(5,28,44,0.18)]">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:h-[72px]">
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/brand/wekongsi-wordmark-white.png"
            alt="We Kongsi"
            width={1316}
            height={396}
            className="h-6 w-auto sm:h-7"
            priority
          />
          <span className="hidden h-6 w-px bg-white/25 md:block" aria-hidden />
          <p className="hidden truncate font-display text-sm font-semibold text-white/85 md:block">
            {tr(UI.brandTagline)}
          </p>
        </div>
        <LanguageToggle variant="dark" />
      </div>
    </header>
  );
}

function BrandFooter({ year }: { year: number }) {
  const { tr } = useLanguage();
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-3 px-4 py-7 sm:flex-row sm:justify-between">
        <Image
          src="/brand/wekongsi-wordmark.png"
          alt="We Kongsi"
          width={216}
          height={36}
          className="h-5 w-auto opacity-80"
        />
        <p className="text-center text-xs text-ink-muted sm:text-right">
          © {year} {tr(UI.footerRights)}
        </p>
      </div>
    </footer>
  );
}
