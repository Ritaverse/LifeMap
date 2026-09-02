import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;
  const description = "东方命理、西方占星与 AI 解释共同构成的当代个人反思体验。";

  return {
    title: { default: "Life Map · 人生地图", template: "%s · Life Map" },
    description,
    openGraph: {
      title: "Life Map · 看见属于你的人生地图",
      description,
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Life Map 品牌预览" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Life Map · 看见属于你的人生地图",
      description,
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F5F1E8",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
