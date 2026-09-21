import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/life-map-social.png`;
  const description = "Life Map 融合东方命理与西方占星，把古老观察变成自我理解、现实行动与同路成长的人生地图。";

  return {
    title: { default: "Life Map · 观星读象，照见更好的自己", template: "%s · Life Map" },
    description,
    openGraph: {
      title: "Life Map · 观星读象，照见更好的自己",
      description,
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Life Map 东方命理、西方占星与共同成长品牌预览" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Life Map · 观星读象，照见更好的自己",
      description,
      images: [socialImage],
    },
  };
}

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
