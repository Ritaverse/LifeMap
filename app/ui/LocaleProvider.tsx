"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  detectInputLocale,
  detectPreferredLocale,
  localeHtmlTag,
  localized,
  type AppLocale,
} from "../lib/locale.ts";

const LOCALE_COOKIE_NAME = "life-map-locale";

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  text: <T>(zh: T, en: T) => T;
  inputLocale: (input: string) => AppLocale;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyDocumentLocale(locale: AppLocale) {
  document.documentElement.lang = localeHtmlTag(locale);
  document.documentElement.dataset.locale = locale;
}

export function LocaleProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: AppLocale }) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    const next: AppLocale = stored === "zh-CN" || stored === "en"
      ? stored
      : initialLocale ?? detectPreferredLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
    applyDocumentLocale(next);
    queueMicrotask(() => setLocaleState((current) => current === next ? current : next));
  }, [initialLocale]);

  const setLocale = useCallback((next: AppLocale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(next)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    setLocaleState(next);
    applyDocumentLocale(next);
  }, []);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    text: <T,>(zh: T, en: T) => localized(locale, zh, en),
    inputLocale: (input: string) => detectInputLocale(input, locale),
  }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, text } = useLocale();
  return (
    <div className={`locale-switcher ${className}`.trim()} role="group" aria-label={text("语言", "Language")}>
      <button type="button" aria-pressed={locale === "zh-CN"} onClick={() => setLocale("zh-CN")}>中文</button>
      <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
    </div>
  );
}
