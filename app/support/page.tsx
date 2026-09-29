import type { Metadata } from "next";
import { publicSupportEmail, publicSupportUrl } from "../lib/site-config";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "Support · 支持",
  description: "Help with Life Map use, privacy, calculations, and digital report orders. 获取 Life Map 使用与报告订单帮助。",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <PublicTrustLayout
      currentPath="/support"
      eyebrow="Support · 支持"
      title="告诉我们哪里没有说清楚"
      summary="这里处理功能、可访问性、隐私、计算显示与数字报告订单问题；不提供真人命理解读或紧急支持。"
      eyebrowEn="Support"
      titleEn="Tell us what was not clear"
      summaryEn="Support covers features, accessibility, privacy, calculation display, and digital report orders. It does not provide personal readings or emergency support."
      englishChildren={<>
        <section><h2>Contact channel</h2>{publicSupportEmail ? <p>Public support email: <a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>. Do not send birth data, payment-card numbers, or other sensitive information.</p> : publicSupportUrl ? <p>Use the <a href={publicSupportUrl.toString()} rel="noreferrer">secure support form</a>. Do not send birth data, payment-card numbers, or a full PDF.</p> : <p><strong>A public support channel is not enabled yet.</strong> Paid features remain closed until the operator verifies intake and response procedures.</p>}<p>We will address report delivery and refund issues as soon as practical, but do not currently promise a fixed response time.</p></section>
        <section><h2>Include this with a request</h2><ul><li>the page path, such as <strong>/onboarding</strong> or <strong>/life-map</strong>;</li><li>device, browser, and approximate time;</li><li>what you expected and what happened;</li><li>if you attach a screenshot, cover names, birth details, and question content first.</li></ul><p>Do not send birth date, birth time, precise location, identity documents, medical records, payment-card numbers, or another person’s data.</p></section>
        <section><h2>Common help links</h2><ul><li>Where data is stored: <a href="/privacy">Privacy Policy</a>.</li><li>Purchase state and delivery window: <a href="/digital-delivery">Digital Delivery</a>.</li><li>Resend a download link: <a href="/report/access">Report Recovery</a>.</li><li>Refund scope: <a href="/refund">Refund Policy</a>.</li><li>Reflection-tool boundaries: <a href="/terms">Terms of Use</a>.</li></ul></section>
        <section><h2>When you need immediate help</h2><p>Life Map is not a medical, mental-health, legal, financial, or emergency service. If you or someone else may be in immediate danger, contact local emergency services or trusted professional support instead of waiting for this site.</p><aside><p><strong>Order support:</strong> use report recovery first. When contacting support, provide only the Shopify order number, purchase email, and issue description—never birth details, card numbers, or a full PDF.</p></aside><p><time dateTime="2026-09-28">Updated September 28, 2026</time></p></section>
      </>}
    >
      <section>
        <h2>联系渠道</h2>
        {publicSupportEmail ? (
          <p>公开支持邮箱：<a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>。请勿发送出生资料、付款卡号或其他敏感信息。</p>
        ) : publicSupportUrl ? (
          <p>使用<a href={publicSupportUrl.toString()} rel="noreferrer">安全支持表单</a>联系我们。请勿发送出生资料、付款卡号或完整 PDF。</p>
        ) : (
          <p><strong>尚未启用公开支持渠道。</strong>付费功能会保持关闭，直到运营方验证可收件渠道与回复流程。</p>
        )}
        <p>我们会尽快处理报告交付与退款问题，但目前不承诺固定响应时效。</p>
      </section>

      <section>
        <h2>提交问题时请包含</h2>
        <ul>
          <li>出现问题的页面路径，例如 <strong>/onboarding</strong> 或 <strong>/life-map</strong>；</li>
          <li>使用的设备、浏览器和大致发生时间；</li>
          <li>你预期发生什么，以及实际看到了什么；</li>
          <li>如需截图，请先遮挡姓名、出生信息和问题内容。</li>
        </ul>
        <p>请不要发送出生日期、出生时间、精确地点、身份证件、医疗记录、付款卡号或他人的资料。</p>
      </section>

      <section>
        <h2>常见问题入口</h2>
        <ul>
          <li>资料保存在何处：查看 <a href="/privacy">隐私政策</a>。</li>
          <li>购买状态与交付期限：查看 <a href="/digital-delivery">数字交付说明</a>。</li>
          <li>重新发送下载链接：前往 <a href="/report/access">报告恢复页</a>。</li>
          <li>退款范围：查看 <a href="/refund">退款政策</a>。</li>
          <li>反思工具的使用边界：查看 <a href="/terms">使用条款</a>。</li>
        </ul>
      </section>

      <section>
        <h2>需要即时帮助时</h2>
        <p>
          Life Map 不是医疗、心理、法律、财务或紧急支持服务。如果你或他人可能处于即时危险中，请联系所在地的紧急服务或可信赖的专业支持，不要等待本网站回复。
        </p>
        <aside>
          <p><strong>订单支持：</strong>先使用报告恢复页自助补发链接。联系支持时只提供 Shopify 订单号、购买邮箱和问题描述；不要发送出生资料、付款卡号或完整 PDF。</p>
        </aside>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
