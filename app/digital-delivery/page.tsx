import type { Metadata } from "next";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "Digital Report Delivery · 数字报告交付",
  description: "Generation, payment verification, email delivery, and access recovery for the Life Map USD $2 report. Life Map 数字报告交付规则。",
  alternates: { canonical: "/digital-delivery" },
};

export default function DigitalDeliveryPage() {
  return (
    <PublicTrustLayout
      currentPath="/digital-delivery"
      eyebrow="Digital Delivery · 数字交付"
      title="一份报告，一个清楚价格"
      summary="Life Map 只销售一款 USD $2.00 的十页个性化 PDF。购买入口会在整条私人交付链通过检查后自动开放；门槛未通过时不会进入结账。"
      eyebrowEn="Digital Delivery"
      titleEn="One report, one clear price"
      summaryEn="Life Map offers one personalized ten-page PDF for USD $2.00. Purchase opens only after the full private-delivery chain passes its checks; otherwise checkout remains unavailable."
      englishChildren={<>
        <section><h2>Product and contents</h2><ul><li>Product: Life Map Full Personal Report, ten-page PDF, USD $2.00, one-time purchase.</li><li>Includes BaZi, Zi Wei, Western astrology, current timing, cross-system evidence, eight life domains, a seven-day practice, and limitations.</li><li>No subscription, automatic renewal, physical shipping, or hidden tier.</li><li>Free chart facts and evidence will not be hidden because reports are sold.</li></ul></section>
        <section><h2>Delivery after payment</h2><ul><li>Your browser creates the PDF and sends a random report ID into Shopify; Shopify does not receive report text.</li><li>A file unlocks only for an HMAC-verified order whose product, currency, amount, and paid status all match.</li><li>The access link in the delivery email is valid for 24 hours. After exchange, the download session lasts 15 minutes and allows at most three downloads.</li><li>The report is retained for 30 days. During that period, request a new link from the <a href="/report/access">report recovery page</a> using the order number and purchase email.</li><li>A temporary PDF without checkout is deleted after 24 hours. A file with Shopify checkout may remain up to 32 days so a still-payable cart does not lose its delivery file.</li></ul></section>
        <section><h2>Data boundary</h2><p>Shopify handles checkout, but Life Map does not send your chart name, birth date, birth time, birth place, chart facts, reflection content, or PDF as product attributes. Shopify may separately collect contact and payment information required for checkout; see the <a href="/privacy">Privacy Policy</a>.</p><aside><p><strong>Secure gate first:</strong> if the report page says purchase is unavailable, do not pay through an old Shopify link. Only an order created from the current Life Map report page can be delivered automatically.</p></aside></section>
        <section><h2>If something goes wrong</h2><p>Check spam first, then use <a href="/report/access">/report/access</a> to recover access. If that does not resolve the issue, see <a href="/support">Support</a>. Do not send birth details or the full PDF.</p><p><time dateTime="2026-09-28">Updated September 28, 2026</time></p></section>
      </>}
    >
      <section>
        <h2>商品与包含内容</h2>
        <ul>
          <li>商品：Life Map Full Personal Report，十页 PDF，USD $2.00，一次性购买。</li>
          <li>包括八字、紫微、西占、当前时运、跨体系证据、八个生命领域、七日练习与限制说明。</li>
          <li>没有订阅、自动续费、实体配送或额外隐藏档位。</li>
          <li>免费命盘事实与证据不会因未来报告销售而被隐藏。</li>
        </ul>
      </section>

      <section>
        <h2>付款后如何交付</h2>
        <ul>
          <li>浏览器先生成 PDF，并把随机报告编号带入 Shopify；Shopify 不接收报告正文。</li>
          <li>只有经过 HMAC 验证且商品、币种、金额与付款状态全部匹配的订单才会解锁文件。</li>
          <li>下载邮件中的访问链接有效 24 小时；交换后形成 15 分钟下载会话，最多下载 3 次。</li>
          <li>报告保留 30 天。期间可在 <a href="/report/access">报告恢复页</a>用订单号和购买邮箱申请新链接。</li>
          <li>未开始结账的临时 PDF 会在 24 小时后删除；已创建 Shopify 结账的文件最多保留 32 天，确保购物车仍可付款时不会提前丢失交付文件。</li>
        </ul>
      </section>

      <section>
        <h2>资料边界</h2>
        <p>
          Shopify 处理结账，但 Life Map 不会把命盘称呼、出生日期、出生时间、出生地点、命盘事实、反思内容或 PDF 作为商品属性发送给 Shopify。Shopify 可能另行收集完成结账所需的联系与付款信息；详情见
          <a href="/privacy">隐私政策</a>。
        </p>
        <aside>
          <p><strong>安全门槛优先：</strong>如果报告页显示“购买尚未开放”，请不要使用旧 Shopify 链接付款。只有从 Life Map 当前报告页创建的随机报告订单才能自动交付。</p>
        </aside>
      </section>

      <section>
        <h2>遇到问题</h2>
        <p>未收到邮件时，请先查看垃圾邮件，再使用 <a href="/report/access">/report/access</a> 恢复。仍有问题可查看 <a href="/support">支持页面</a>；请勿发送出生资料或完整 PDF。</p>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
