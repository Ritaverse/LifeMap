"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="app-shell">
      <div className="page state-page">
        <span className="state-mark" aria-hidden="true">!</span>
        <p className="eyebrow">TEMPORARY INTERRUPTION · 暂时中断</p>
        <h1>这次读取没有完成</h1>
        <p>你的出生资料仍保留在当前浏览器会话中。可以重试，或安全地返回首页。</p>
        <div className="landing__actions">
          <button className="button button--primary" type="button" onClick={reset}>重新尝试</button>
          <Link className="button button--secondary" href="/">返回首页</Link>
        </div>
      </div>
    </main>
  );
}
