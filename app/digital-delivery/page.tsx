import type { Metadata } from "next";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "数字报告交付",
  description: "Life Map USD $2 完整数字报告的生成、付款验证、邮件交付与访问恢复规则。",
  alternates: { canonical: "/digital-delivery" },
};

export default function DigitalDeliveryPage() {
  return (
    <PublicTrustLayout
      currentPath="/digital-delivery"
      eyebrow="Digital Delivery · 数字交付"
      title="一份报告，一个清楚价格"
      summary="Life Map 只销售一款 USD $2.00 的十页个性化 PDF。购买入口会在整条私人交付链通过检查后自动开放；门槛未通过时不会进入结账。"
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
