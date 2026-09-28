import type { Metadata } from "next";
import { publicSupportEmail } from "../lib/site-config";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "退款政策",
  description: "Life Map 公开测试期间的无销售状态，以及未来个性化数字报告的退款政策框架。",
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
  return (
    <PublicTrustLayout
      currentPath="/refund"
      eyebrow="Refunds · 退款"
      title="测试期间没有需要退款的销售"
      summary="Life Map 公开测试版不接受报告付款，因此目前不会产生扣款、订单或退款。以下内容是正式销售前必须完成并公布的政策框架。"
    >
      <section>
        <h2>当前测试版</h2>
        <p>购买按钮会保持关闭或明确标为不可购买。如果你在其他页面看到 Shopify 商店或旧链接，请不要付款，并通过 <a href="/support">支持页面</a> 告知我们。</p>
      </section>

      <section>
        <h2>未来开放后的基本原则</h2>
        <p>正式政策会尊重适用的消费者保护法律。个性化数字报告生成后通常无法像实体商品一样退回，但以下情况将提供退款或重新交付：</p>
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
        <p>这些限制不会减少适用法律赋予你的强制性权利。正式销售前，我们还会公布申请期限、处理时效和退款原路返回方式。</p>
      </section>

      <section>
        <h2>未来如何申请</h2>
        <p>
          申请时只需提供订单号、购买邮箱和问题说明。请勿在支持邮件中发送完整出生资料。{publicSupportEmail ? <>未来可联系 <a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>；销售开放前仍会公布处理时效。</> : <>公开支持邮箱尚未启用，必须在销售开放前完成地址与回复流程验证。</>}
        </p>
        <aside>
          <p><strong>尚未生效：</strong>个性化数字报告仍未对外销售。最终退款条款将在购买按钮启用前显示于结账入口附近。</p>
        </aside>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
