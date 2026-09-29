import type { Metadata } from "next";
import { publicSupportEmail } from "../lib/site-config";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "支持",
  description: "获取 Life Map 公开测试版的使用、隐私、计算与未来数字报告帮助。",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <PublicTrustLayout
      currentPath="/support"
      eyebrow="Support · 支持"
      title="告诉我们哪里没有说清楚"
      summary="公开测试版欢迎功能、可访问性、隐私与计算显示问题。测试期间不提供真人命理解读、紧急支持或订单处理。"
    >
      <section>
        <h2>联系渠道</h2>
        {publicSupportEmail ? (
          <p>公开支持邮箱：<a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>。请勿发送出生资料、付款卡号或其他敏感信息。</p>
        ) : (
          <p><strong>尚未启用公开支持邮箱。</strong>站点会保持非公开，直到运营方验证可收件地址与回复流程；请勿把任何地址猜作官方支持渠道。</p>
        )}
        <p>测试期暂不承诺固定响应时效。未来开放销售前，会在这里公布可用渠道和预计回复时间。</p>
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
