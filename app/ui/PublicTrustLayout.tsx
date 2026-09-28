import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./public-trust.module.css";

const trustLinks = [
  { href: "/privacy", label: "隐私" },
  { href: "/terms", label: "使用条款" },
  { href: "/digital-delivery", label: "数字交付" },
  { href: "/refund", label: "退款" },
  { href: "/support", label: "支持" },
] as const;

type TrustPath = (typeof trustLinks)[number]["href"];

interface PublicTrustLayoutProps {
  currentPath: TrustPath;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}

export function PublicTrustLayout({ currentPath, eyebrow, title, summary, children }: PublicTrustLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.wordmark} href="/" aria-label="Life Map 首页">
            <span className={styles.mark} aria-hidden="true" />
            <span>
              <strong>Life Map</strong>
              <small>观星读象 · 照见自己</small>
            </span>
          </Link>
          <Link className={styles.homeLink} href="/">
            返回首页 <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.summary}>{summary}</p>
          <div className={styles.status}>
            <span aria-hidden="true" />
            公开测试版 · 当前政策
          </div>
        </header>

        <nav className={styles.policyNav} aria-label="信任与政策导航">
          {trustLinks.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              aria-current={item.href === currentPath ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <article className={styles.article}>{children}</article>
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>清楚说明，安心探索。</strong>
          <p>这些页面会随产品功能变化而更新；重大变更将在使用相关功能前说明。</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/support">联系支持</Link>
          <Link href="/">Life Map 首页</Link>
        </div>
      </footer>
    </div>
  );
}

