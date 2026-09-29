"use client";

import Link from "next/link";
import { useLocale } from "./ui/LocaleProvider";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { text } = useLocale();
  return (
    <main className="app-shell">
      <div className="page state-page">
        <span className="state-mark" aria-hidden="true">!</span>
        <p className="eyebrow">{text("TEMPORARY INTERRUPTION · 暂时中断", "TEMPORARY INTERRUPTION")}</p>
        <h1>{text("这次读取没有完成", "This page did not finish loading")}</h1>
        <p>{text("你的出生资料仍保留在当前浏览器会话中。可以重试，或安全地返回首页。", "Your birth details remain in this browser session. Try again or return safely to the home page.")}</p>
        <div className="landing__actions">
          <button className="button button--primary" type="button" onClick={reset}>{text("重新尝试", "Try again")}</button>
          <Link className="button button--secondary" href="/">{text("返回首页", "Return home")}</Link>
        </div>
      </div>
    </main>
  );
}
