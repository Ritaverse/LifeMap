import type { Metadata } from "next";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "数字报告交付",
  description: "Life Map 数字报告的销售状态，以及未来正式开放前需要明确的交付规则。",
  alternates: { canonical: "/digital-delivery" },
};

export default function DigitalDeliveryPage() {
  return (
    <PublicTrustLayout
      currentPath="/digital-delivery"
      eyebrow="Digital Delivery · 数字交付"
      title="报告销售尚未开放"
      summary="当前公开测试版只提供页面内预览，不收款，也不会在付款后生成或发送 PDF。任何报告预览都不是已购买商品。"
    >
      <section>
        <h2>现在的状态</h2>
        <ul>
          <li>所有付费报告入口在公开测试期间保持关闭或明确标为不可购买。</li>
          <li>当前没有付费订单、下载权利、邮件附件或自动续费。</li>
          <li>免费命盘事实与证据不会因未来报告销售而被隐藏。</li>
        </ul>
      </section>

      <section>
        <h2>正式开放前会明确什么</h2>
        <p>在接受第一笔付款以前，我们会在商品页和本页清楚列出：</p>
        <ul>
          <li>最终价格、币种、税费和报告包含的页数或章节；</li>
          <li>文件格式、预计生成时间、交付方式与下载有效期；</li>
          <li>支付成功但未收到文件时的恢复流程；</li>
          <li>个人使用许可、重新下载范围，以及退款例外。</li>
        </ul>
      </section>

      <section>
        <h2>计划中的资料边界</h2>
        <p>
          未来结账预计由 Shopify 处理，但 Life Map 不会把命盘称呼、出生日期、出生时间、出生地点、命盘事实或反思内容作为商品属性发送给 Shopify。Shopify 可能另行收集完成结账所需的联系与付款信息；正式实现后会先更新
          <a href="/privacy">隐私政策</a>。
        </p>
        <aside>
          <p><strong>请不要测试真实付款：</strong>在本页取消“销售尚未开放”提示前，任何外部商店页面都不应被视为 Life Map 的有效购买流程。</p>
        </aside>
      </section>

      <section>
        <h2>遇到问题</h2>
        <p>当前预览问题请查看 <a href="/support">支持页面</a>。未来数字订单开放后，本页会增加订单恢复入口和明确的交付时效。</p>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
