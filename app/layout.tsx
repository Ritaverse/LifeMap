import type { Metadata, Viewport } from "next";
import { publicSiteUrl } from "./lib/site-config";
import "./globals.css";

const description = "Life Map 融合东方命理与西方占星，把古老观察变成自我理解、现实行动与同路成长的人生地图。";

export const metadata: Metadata = {
  metadataBase: publicSiteUrl,
  applicationName: "Life Map",
  title: { default: "Life Map · 观星读象，照见更好的自己", template: "%s · Life Map" },
  description,
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Life Map · 观星读象，照见更好的自己",
    description,
    type: "website",
    url: "/",
    siteName: "Life Map",
    locale: "zh_CN",
    images: [{ url: "/life-map-social.jpg", width: 1200, height: 630, alt: "Life Map 东方命理、西方占星与共同成长品牌预览" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Life Map · 观星读象，照见更好的自己",
    description,
    images: ["/life-map-social.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#160E2F",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
