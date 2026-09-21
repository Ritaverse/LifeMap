import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og-journey-v2.png`;
  const description = "从八字、紫微与西方占星的确定性事实出发，把此刻的问题变成可追溯的洞察与一个可验证的小行动。";

  return {
    title: { default: "Life Map · 人生地图", template: "%s · Life Map" },
    description,
    openGraph: {
      title: "Life Map · 把此刻的问题看得更清楚",
      description,
      type: "website",
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Life Map 品牌预览" }],
    },
    twitter: {
      card: "summary_large_image",
    title: "Life Map · 把此刻的问题看得更清楚",
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
