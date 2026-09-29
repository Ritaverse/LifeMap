"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { exchangeReportAccessToken, requestReportAccess } from "../lib/shopify";
import { BrandMark } from "./BrandMark";
import { LocaleSwitcher, useLocale } from "./LocaleProvider";
import styles from "./report-access.module.css";

type AccessState = "idle" | "checking" | "ready" | "invalid" | "sending" | "sent" | "error";

export function ReportAccess() {
  const { setLocale, text } = useLocale();
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
      .then((result) => {
        if (result.locale === "en" || result.locale === "zh-CN") setLocale(result.locale);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [setLocale]);

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
        <Link href="/" aria-label={text("Life Map 首页", "Life Map home")}><BrandMark className={styles.mark} /><strong>Life Map</strong></Link>
        <div className={styles.topbarActions}><LocaleSwitcher /><Link href="/support">{text("需要帮助", "Need help?")}</Link></div>
      </header>
      <main className={styles.main}>
        <p className={styles.eyebrow}>{text("PRIVATE DELIVERY · 私人交付", "PRIVATE DELIVERY · SECURE ACCESS")}</p>
        <h1>{text(<>取回你的<br />完整报告</>, <>Recover your<br />full report</>)}</h1>
        <p className={styles.lead}>{text("下载密钥只在你的邮件和浏览器之间短暂使用，不会写入网址查询参数。报告文件最多保留 30 天。", "The download key is used briefly between your email and browser and is never placed in URL query parameters. Report files are retained for at most 30 days.")}</p>

        {state === "checking" && <section className={styles.notice} role="status"><strong>{text("正在验证安全下载链接…", "Verifying the secure download link…")}</strong><p>{text("请不要关闭页面。", "Please keep this page open.")}</p></section>}
        {state === "ready" && <section className={`${styles.notice} ${styles.success}`} role="status"><strong>{text("报告已经准备好", "Your report is ready")}</strong><p>{text("下载会话有效 15 分钟，最多可下载 3 次。", "The download session lasts 15 minutes and allows up to three downloads.")}</p><a className={styles.primary} href="/api/report/download">{text("下载完整 PDF", "Download full PDF")}</a></section>}
        {state === "invalid" && <section className={`${styles.notice} ${styles.warning}`} role="alert"><strong>{text("这个链接无效或已经过期", "This link is invalid or expired")}</strong><p>{text("你可以在下方用订单号和购买邮箱申请一封新邮件。", "Request a new email below with your order number and purchase email.")}</p></section>}

        <section className={styles.recovery} aria-labelledby="recover-title">
          <div><p className={styles.eyebrow}>ACCESS RECOVERY</p><h2 id="recover-title">{text("重新发送安全链接", "Send a new secure link")}</h2><p>{text("输入 Shopify 订单号（例如 #1001）和结账邮箱。无论记录是否匹配，页面都会显示相同结果，以保护订单隐私。", "Enter the Shopify order number (for example, #1001) and checkout email. The same result is shown whether or not a record matches to protect order privacy.")}</p></div>
          <form onSubmit={recover}>
            <label><span>{text("Shopify 订单号", "Shopify order number")}</span><input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="#1001" autoComplete="off" required /></label>
            <label><span>{text("购买邮箱", "Purchase email")}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label>
            <button className={styles.primary} disabled={state === "sending"} type="submit">{state === "sending" ? text("正在提交…", "Sending…") : text("发送新的下载链接", "Send new download link")}</button>
          </form>
          {state === "sent" && <p className={styles.formStatus} role="status">{text("如果订单资料匹配且报告仍在保留期内，你会收到一封新邮件。请同时检查垃圾邮件。", "If the order matches and the report is still retained, a new email will arrive. Check spam as well.")}</p>}
          {state === "error" && <p className={`${styles.formStatus} ${styles.formError}`} role="alert">{text("暂时无法提交，请稍后再试，或前往支持页面。", "The request could not be sent. Try again later or visit Support.")}</p>}
        </section>

        <aside className={styles.boundary}><strong>{text("隐私边界", "Privacy boundary")}</strong><p>{text("Shopify 只收到随机报告编号、商品与金额。姓名、出生资料、地点和命盘事实不会作为商品属性发送给 Shopify。", "Shopify receives only a random report ID, product, and amount. Your name, birth details, location, and chart facts are not sent as product attributes.")}</p></aside>
      </main>
      <footer className={styles.footer}><Link href="/digital-delivery">{text("数字交付说明", "Digital delivery")}</Link><Link href="/refund">{text("退款政策", "Refund policy")}</Link><Link href="/privacy">{text("隐私政策", "Privacy policy")}</Link></footer>
    </div>
  );
}
