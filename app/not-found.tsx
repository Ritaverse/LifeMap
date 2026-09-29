"use client";

import Link from "next/link";
import { useLocale } from "./ui/LocaleProvider";

export default function NotFound() {
  const { text } = useLocale();
  return (
    <main className="app-shell">
      <div className="page state-page">
        <span className="state-mark" aria-hidden="true">404</span>
        <p className="eyebrow">{text("PAGE NOT FOUND · 星路暂隐", "PAGE NOT FOUND · PATH OUT OF VIEW")}</p>
        <h1>{text("这里没有找到对应的页面", "We could not find this page")}</h1>
        <p>{text("链接可能已经改变。你可以回到首页，或重新生成属于自己的 Life Map。", "The link may have changed. Return home or create your Life Map again.")}</p>
        <Link className="button button--primary" href="/">{text("返回首页", "Return home")}</Link>
      </div>
    </main>
  );
}
