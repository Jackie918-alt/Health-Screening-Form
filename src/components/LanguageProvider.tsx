"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { DEFAULT_LANG, LANGS, LANG_META, type Lang, type Localized } from "@/lib/i18n";
import { createPersistedStore } from "@/lib/persisted-store";

const langStore = createPersistedStore("wekongsi.survey.lang");

function isLang(value: string | null): value is Lang {
  return value !== null && (LANGS as readonly string[]).includes(value);
}

type LanguageContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Resolves a `Localized` pair in the active language. */
  tr: (text: Localized) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // The agent's saved choice is external state, so it is read through the store
  // rather than restored with an effect.
  const stored = useSyncExternalStore(
    langStore.subscribe,
    langStore.getSnapshot,
    langStore.getServerSnapshot,
  );
  const lang: Lang = isLang(stored) ? stored : DEFAULT_LANG;

  const setLang = useCallback((next: Lang) => langStore.set(next), []);

  // Keep the document language in sync for screen readers and browser translation.
  useEffect(() => {
    document.documentElement.lang = LANG_META[lang].htmlLang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({ lang, setLang, tr: (text) => text[lang] }),
    [lang, setLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
