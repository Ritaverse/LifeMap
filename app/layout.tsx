import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;
  const description = "从可追溯的多体系反思地图出发，把一个主题变成现实行动，也可以在象征物商城为它选择日常载体。";

  return {
    title: { default: "Life Map · 人生地图", template: "%s · Life Map" },
    description,
    openGraph: {
      title: "Life Map · 看见自己，也把主题带进日常",
      description,
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Life Map 品牌预览" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Life Map · 看见自己，也把主题带进日常",
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
