"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { exchangeReportAccessToken, requestReportAccess } from "../lib/shopify";
import styles from "./report-access.module.css";

type AccessState = "idle" | "checking" | "ready" | "invalid" | "sending" | "sent" | "error";

export function ReportAccess() {
  const [state, setState] = useState<AccessState>("idle");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = parameters.get("token");
    if (!token) return;
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    queueMicrotask(() => setState("checking"));
    exchangeReportAccessToken(token)
      .then(() => setState("ready"))
      .catch(() => setState("invalid"));
  }, []);

  const recover = async (event: FormEvent) => {
    event.preventDefault();
    setState("sending");
    try {
      await requestReportAccess(orderNumber, email);
      setEmail("");
      setOrderNumber("");
      setState("sent");
    } catch {
      setState("error");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/" aria-label="Life Map 首页"><span aria-hidden="true">◌</span><strong>Life Map</strong></Link>
        <Link href="/support">需要帮助</Link>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>PRIVATE DELIVERY · 私人交付</p>
        <h1>取回你的<br />完整报告</h1>
        <p className={styles.lead}>下载密钥只在你的邮件和浏览器之间短暂使用，不会写入网址查询参数。报告文件最多保留 30 天。</p>

        {state === "checking" && <section className={styles.notice} role="status"><strong>正在验证安全下载链接…</strong><p>请不要关闭页面。</p></section>}
        {state === "ready" && <section className={`${styles.notice} ${styles.success}`} role="status"><strong>报告已经准备好</strong><p>下载会话有效 15 分钟，最多可下载 3 次。</p><a className={styles.primary} href="/api/report/download">下载完整 PDF</a></section>}
        {state === "invalid" && <section className={`${styles.notice} ${styles.warning}`} role="alert"><strong>这个链接无效或已经过期</strong><p>你可以在下方用订单号和购买邮箱申请一封新邮件。</p></section>}

        <section className={styles.recovery} aria-labelledby="recover-title">
          <div><p className={styles.eyebrow}>ACCESS RECOVERY</p><h2 id="recover-title">重新发送安全链接</h2><p>输入 Shopify 订单号（例如 #1001）和结账邮箱。无论记录是否匹配，页面都会显示相同结果，以保护订单隐私。</p></div>
          <form onSubmit={recover}>
            <label><span>Shopify 订单号</span><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="#1001" autoComplete="off" required /></label>
            <label><span>购买邮箱</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <button className={styles.primary} disabled={state === "sending"} type="submit">{state === "sending" ? "正在提交…" : "发送新的下载链接"}</button>
          </form>
          {state === "sent" && <p className={styles.formStatus} role="status">如果订单资料匹配且报告仍在保留期内，你会收到一封新邮件。请同时检查垃圾邮件。</p>}
          {state === "error" && <p className={`${styles.formStatus} ${styles.formError}`} role="alert">暂时无法提交，请稍后再试，或前往支持页面。</p>}
        </section>

        <aside className={styles.boundary}><strong>隐私边界</strong><p>Shopify 只收到随机报告编号、商品与金额。姓名、出生资料、地点和命盘事实不会作为商品属性发送给 Shopify。</p></aside>
      </main>
      <footer className={styles.footer}><Link href="/digital-delivery">数字交付说明</Link><Link href="/refund">退款政策</Link><Link href="/privacy">隐私政策</Link></footer>
    </div>
  );
}
