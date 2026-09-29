export type AppLocale = "zh-CN" | "en";

export const DEFAULT_LOCALE: AppLocale = "zh-CN";
export const LOCALE_STORAGE_KEY = "life-map-locale-v1";

export function normalizeLocale(value: string | null | undefined): AppLocale {
  return value?.trim().toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function detectPreferredLocale(values: readonly string[] | null | undefined): AppLocale {
  if (!values?.length) return DEFAULT_LOCALE;
  const firstSupported = values.find((value) => /^(zh|en)(-|$)/i.test(value));
  return firstSupported ? normalizeLocale(firstSupported) : DEFAULT_LOCALE;
}

export function detectInputLocale(input: string, fallback: AppLocale = DEFAULT_LOCALE): AppLocale {
  const hanCount = (input.match(/[\u3400-\u9fff]/g) ?? []).length;
  const latinCount = (input.match(/[A-Za-z]/g) ?? []).length;
  if (hanCount === 0 && latinCount === 0) return fallback;
  if (hanCount > 0 && hanCount >= Math.ceil(latinCount / 3)) return "zh-CN";
  if (latinCount >= 2) return "en";
  return fallback;
}

export function localized<T>(locale: AppLocale, zh: T, en: T): T {
  return locale === "zh-CN" ? zh : en;
}

export function localeHtmlTag(locale: AppLocale) {
  return locale === "zh-CN" ? "zh-CN" : "en";
}
