import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell">
      <div className="page state-page">
        <span className="state-mark" aria-hidden="true">404</span>
        <p className="eyebrow">PAGE NOT FOUND · 星路暂隐</p>
        <h1>这里没有找到对应的页面</h1>
        <p>链接可能已经改变。你可以回到首页，或重新生成属于自己的 Life Map。</p>
        <Link className="button button--primary" href="/">返回首页</Link>
      </div>
    </main>
  );
}
