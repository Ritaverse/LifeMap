const DEFAULT_PUBLIC_SITE_URL = "https://lifemap.fyi";

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function resolvePublicSiteUrl(value = process.env.NEXT_PUBLIC_SITE_URL): URL {
  try {
    const url = new URL(value?.trim() || DEFAULT_PUBLIC_SITE_URL);
    const hasSafeProtocol = url.protocol === "https:" || (url.protocol === "http:" && isLocalHostname(url.hostname));
    if (!hasSafeProtocol || url.username || url.password) throw new Error("Unsafe public site URL");
    return new URL("/", url);
  } catch {
    return new URL(DEFAULT_PUBLIC_SITE_URL);
  }
}

export const publicSiteUrl = resolvePublicSiteUrl();

export function resolveSupportEmail(value = process.env.NEXT_PUBLIC_SUPPORT_EMAIL): string | null {
  const email = value?.trim() ?? "";
  if (!email || email.length > 254 || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) return null;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  if (domain === "example.com" || domain.endsWith(".example.com") || domain.endsWith(".invalid")) return null;
  return email;
}

export const publicSupportEmail = resolveSupportEmail();

export function resolveSupportUrl(value = process.env.NEXT_PUBLIC_SUPPORT_URL): URL | null {
  try {
    const url = new URL(value?.trim() || "");
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (!["lifemap.fyi", "dj4xdu-gb.myshopify.com"].includes(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

export const publicSupportUrl = resolveSupportUrl();
