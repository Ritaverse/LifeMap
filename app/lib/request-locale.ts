import "server-only";

import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, detectPreferredLocale, type AppLocale } from "./locale.ts";

export const LOCALE_COOKIE_NAME = "life-map-locale";

export function parseAcceptLanguage(value: string | null): AppLocale {
  if (!value) return DEFAULT_LOCALE;
  const ordered = value
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters.find((parameter) => parameter.trim().startsWith("q="));
      return { tag, quality: quality ? Number(quality.split("=")[1]) || 0 : 1 };
    })
    .filter((item) => item.tag)
    .sort((left, right) => right.quality - left.quality)
    .map((item) => item.tag);
  return detectPreferredLocale(ordered);
}

export async function resolveRequestLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const explicit = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (explicit === "zh-CN" || explicit === "en") return explicit;
  const requestHeaders = await headers();
  return parseAcceptLanguage(requestHeaders.get("accept-language"));
}
