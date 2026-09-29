import type { Metadata } from "next";
import { publicSupportEmail, publicSupportUrl } from "../lib/site-config";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "Refund Policy · 退款政策",
  description: "Eligibility, request timing, and revocation rules for the personalized Life Map digital report. Life Map 个性化报告退款规则。",
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
  return (
    <PublicTrustLayout
      currentPath="/refund"
      eyebrow="Refunds · 退款"
      title="数字报告退款与撤销"
      summary="USD $2.00 个性化报告属于一次性数字商品。购买入口关闭时不会产生订单；开放后，以下规则适用于已验证的 Life Map 报告订单。"
      eyebrowEn="Refunds"
      titleEn="Digital report refunds and revocation"
      summaryEn="The USD $2.00 personalized report is a one-time digital product. No order is created while purchase is closed; once open, these rules apply to verified Life Map report orders."
      englishChildren={<>
        <section><h2>While purchase is closed</h2><p>If the report page says purchase is unavailable, no valid Life Map report order is created. Do not use an old Shopify link; tell us through <a href="/support">Support</a>.</p></section>
        <section><h2>Core policy</h2><p>This policy respects applicable consumer-protection law. A personalized digital report usually cannot be returned like a physical item after generation, but a refund or redelivery is available when:</p><ul><li>the same order is charged more than once;</li><li>a confirmed payment is followed by a system failure that prevents generation or delivery and reasonable troubleshooting does not resolve it;</li><li>the delivered file is corrupt, missing pages, or materially different from the purchased product;</li><li>applicable law requires another refund.</li></ul></section>
        <section><h2>Reasons that normally do not qualify</h2><ul><li>changing your mind after the report has been generated;</li><li>disagreeing with a reflective interpretation or expecting a guarantee about real-world outcomes;</li><li>submitting an incorrect birth date, time, or place after the file has been generated from that input.</li></ul><p>These limits do not reduce mandatory rights under applicable law. Unless local law provides longer, submit a request within 14 calendar days of purchase. We aim to acknowledge it within five business days. Approved refunds return to the original Shopify payment method; the payment provider controls settlement timing.</p><p>After Shopify sends a refund or cancellation event, Life Map revokes download keys and deletes the private PDF. A new report requires a new generation and purchase.</p></section>
        <section><h2>How to request help</h2><p>Provide only the order number, purchase email, and a description of the issue. Do not send full birth details. {publicSupportEmail ? <>Contact <a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>.</> : publicSupportUrl ? <>Use the <a href={publicSupportUrl.toString()} rel="noreferrer">secure support form</a>.</> : <>A public support channel is not enabled, so the paid-launch gate remains closed.</>}</p><aside><p><strong>Order identification:</strong> only orders created from the current Life Map report page whose product and amount pass validation are handled. Do not send birth data or a full report in support messages.</p></aside><p><time dateTime="2026-09-28">Updated September 28, 2026</time></p></section>
      </>}
    >
      <section>
        <h2>购买入口关闭时</h2>
        <p>如果报告页显示“购买尚未开放”，就不会创建有效的 Life Map 报告订单。请勿使用旧 Shopify 链接付款，并通过 <a href="/support">支持页面</a> 告知我们。</p>
      </section>

      <section>
        <h2>基本原则</h2>
        <p>本政策尊重适用的消费者保护法律。个性化数字报告生成后通常无法像实体商品一样退回，但以下情况会提供退款或重新交付：</p>
        <ul>
          <li>同一订单发生重复扣款；</li>
          <li>确认收款后，系统故障导致报告无法生成或交付，且合理排查后仍未解决；</li>
          <li>交付文件损坏、内容缺页，或与所购商品明显不符；</li>
          <li>适用法律要求的其他退款情形。</li>
        </ul>
      </section>

      <section>
        <h2>通常不构成退款理由</h2>
        <ul>
          <li>报告已按订单生成后改变主意；</li>
          <li>不认同反思性解释，或期待命盘对现实结果作出保证；</li>
          <li>用户提交的出生日期、时间或地点有误，而文件已据此生成。</li>
        </ul>
        <p>这些限制不会减少适用法律赋予你的强制性权利。除适用法律规定更长期限外，请在购买后 14 个自然日内提交申请；我们会在 5 个工作日内确认受理，批准的退款退回 Shopify 原付款方式，实际到账时间由支付机构决定。</p>
        <p>Shopify 发出退款或取消事件后，Life Map 会撤销所有下载密钥并删除私人 PDF；之后如需报告，需要重新生成和购买。</p>
      </section>

      <section>
        <h2>如何申请</h2>
        <p>
          申请时只需提供订单号、购买邮箱和问题说明。请勿发送完整出生资料。{publicSupportEmail ? <>可联系 <a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>。</> : publicSupportUrl ? <>可使用<a href={publicSupportUrl.toString()} rel="noreferrer">安全支持表单</a>。</> : <>公开支持渠道尚未启用，因此付费上线门槛保持关闭。</>}
        </p>
        <aside>
          <p><strong>订单识别：</strong>只处理从当前 Life Map 报告页创建、且商品与金额验证通过的订单。请勿在支持邮件中发送出生资料或完整报告。</p>
        </aside>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
