"use client";

import Link from "next/link";
import { LocaleProvider, useLocale } from "./ui/LocaleProvider";

function GlobalErrorContent({ reset }: { reset: () => void }) {
  const { text } = useLocale();
  return (
    <main className="app-shell">
      <div className="page state-page">
        <span className="state-mark" aria-hidden="true">!</span>
        <p className="eyebrow">{text("LIFE MAP · 暂时中断", "LIFE MAP · TEMPORARY INTERRUPTION")}</p>
        <h1>{text("页面暂时无法打开 · Temporarily unavailable", "This page is temporarily unavailable · 页面暂时无法打开")}</h1>
        <p>{text("请重试；如果问题持续发生，可以返回首页重新开始。 Try again, or return home if the problem continues.", "Try again, or return home if the problem continues. 如果问题持续发生，请返回首页重新开始。")}</p>
        <div className="landing__actions">
          <button className="button button--primary" type="button" onClick={reset}>{text("重新尝试", "Try again")}</button>
          <Link className="button button--secondary" href="/">{text("返回首页", "Return home")}</Link>
        </div>
      </div>
    </main>
  );
}

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <LocaleProvider>
          <GlobalErrorContent reset={reset} />
        </LocaleProvider>
      </body>
    </html>
  );
}
