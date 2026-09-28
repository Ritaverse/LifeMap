"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="zh-CN">
      <body>
        <main className="app-shell">
          <div className="page state-page">
            <span className="state-mark" aria-hidden="true">!</span>
            <p className="eyebrow">LIFE MAP · 暂时中断</p>
            <h1>页面暂时无法打开</h1>
            <p>请重试；如果问题持续发生，可以返回首页重新开始。</p>
            <div className="landing__actions">
              <button className="button button--primary" type="button" onClick={reset}>重新尝试</button>
              <Link className="button button--secondary" href="/">返回首页</Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
