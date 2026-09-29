"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";
import { LocaleSwitcher, useLocale } from "./LocaleProvider";
import styles from "./public-trust.module.css";

const trustLinks = [
  { href: "/privacy", label: "隐私", labelEn: "Privacy" },
  { href: "/terms", label: "使用条款", labelEn: "Terms" },
  { href: "/digital-delivery", label: "数字交付", labelEn: "Delivery" },
  { href: "/refund", label: "退款", labelEn: "Refunds" },
  { href: "/support", label: "支持", labelEn: "Support" },
] as const;

type TrustPath = (typeof trustLinks)[number]["href"];

interface PublicTrustLayoutProps {
  currentPath: TrustPath;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
  eyebrowEn?: string;
  titleEn?: string;
  summaryEn?: string;
  englishChildren?: ReactNode;
}

export function PublicTrustLayout({ currentPath, eyebrow, title, summary, children, eyebrowEn, titleEn, summaryEn, englishChildren }: PublicTrustLayoutProps) {
  const { locale, text } = useLocale();
  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link className={styles.wordmark} href="/" aria-label={text("Life Map 首页", "Life Map home")}>
            <BrandMark className={styles.mark} />
            <span>
              <strong>Life Map</strong>
              <small>{text("观星读象 · 照见自己", "Read the symbols · Know yourself")}</small>
            </span>
          </Link>
          <div className={styles.topbarActions}><LocaleSwitcher /><Link className={styles.homeLink} href="/">{text("返回首页", "Home")} <span aria-hidden="true">↗</span></Link></div>
        </div>
      </header>

      <main className={styles.main}>
        <header className={styles.hero}>
          <p className={styles.eyebrow}>{locale === "en" ? eyebrowEn ?? eyebrow : eyebrow}</p>
          <h1>{locale === "en" ? titleEn ?? title : title}</h1>
          <p className={styles.summary}>{locale === "en" ? summaryEn ?? summary : summary}</p>
          <div className={styles.status}>
            <span aria-hidden="true" />
            {text("公开测试版 · 当前政策", "Public beta · Current policy")}
          </div>
        </header>

        <nav className={styles.policyNav} aria-label={text("信任与政策导航", "Trust and policy navigation")}>
          {trustLinks.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              aria-current={item.href === currentPath ? "page" : undefined}
            >
              {locale === "en" ? item.labelEn : item.label}
            </Link>
          ))}
        </nav>

        <article className={styles.article}>{locale === "en" ? englishChildren ?? children : children}</article>
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>{text("清楚说明，安心探索。", "Clear boundaries make exploration safer.")}</strong>
          <p>{text("这些页面会随产品功能变化而更新；重大变更将在使用相关功能前说明。", "These pages are updated as the product changes. Material changes will be explained before the relevant feature is used.")}</p>
        </div>
        <div className={styles.footerLinks}>
          <Link href="/support">{text("联系支持", "Contact support")}</Link>
          <Link href="/">{text("Life Map 首页", "Life Map home")}</Link>
        </div>
      </footer>
    </div>
  );
}
