import type { Metadata, Viewport } from "next";
import { resolveRequestLocale } from "./lib/request-locale";
import { publicSiteUrl } from "./lib/site-config";
import { LocaleProvider } from "./ui/LocaleProvider";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveRequestLocale();
  const english = locale === "en";
  const title = english
    ? "Life Map · Read the symbols, become more fully yourself"
    : "Life Map · 观星读象，照见更好的自己";
  const description = english
    ? "Eastern destiny traditions and Western astrology for self-understanding, grounded action, and shared growth."
    : "融合东方命理与西方占星，在反思与行动中理解自己，和同路人一起成长。";
  return {
    metadataBase: publicSiteUrl,
    applicationName: "Life Map",
    title: { default: title, template: "%s · Life Map" },
    description,
    alternates: { canonical: "/" },
    manifest: "/manifest.webmanifest",
    openGraph: {
      title,
      description,
      type: "website",
      url: "/",
      siteName: "Life Map",
      locale: english ? "en_US" : "zh_CN",
      alternateLocale: [english ? "zh_CN" : "en_US"],
      images: [{ url: "/life-map-social.jpg", width: 1200, height: 630, alt: english ? "Life Map — Eastern traditions, Western astrology, and shared growth" : "Life Map——东方命理、西方占星与共同成长" }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/life-map-social.jpg"] },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#160E2F",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await resolveRequestLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body><LocaleProvider initialLocale={locale}>{children}</LocaleProvider></body>
    </html>
  );
}
