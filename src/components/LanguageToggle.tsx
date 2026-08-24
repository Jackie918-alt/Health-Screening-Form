"use client";

import { LANGS, LANG_META, UI } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

/**
 * Segmented EN / BM switch. Both labels stay visible at all times — an agent
 * who only reads Malay should never have to decode an English-only control to
 * find their language.
 */
export function LanguageToggle({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { lang, setLang, tr } = useLanguage();
  const onDark = variant === "dark";

  return (
    <div
      role="group"
      aria-label={tr(UI.switchLanguage)}
      className={[
        "inline-flex shrink-0 items-center rounded-full p-1",
        onDark ? "bg-white/12 ring-1 ring-white/20" : "bg-white ring-1 ring-line",
      ].join(" ")}
    >
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            lang={LANG_META[code].htmlLang}
            className={[
              "focus-brand rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors sm:px-4",
              active
                ? onDark
                  ? "bg-white text-deep-800 shadow-sm"
                  : "bg-brand-gradient text-white shadow-sm"
                : onDark
                  ? "text-white/75 hover:text-white"
                  : "text-ink-muted hover:text-deep-700",
            ].join(" ")}
          >
            <span className="sm:hidden">{LANG_META[code].short}</span>
            <span className="hidden sm:inline">{LANG_META[code].label}</span>
          </button>
        );
      })}
    </div>
  );
}
