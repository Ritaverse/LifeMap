import type { Metadata } from "next";
import { publicSupportEmail } from "../lib/site-config";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "了解 Life Map 公开测试版如何在浏览器会话中处理出生资料、反思记录与地点搜索。",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicTrustLayout
      currentPath="/privacy"
      eyebrow="Privacy · 隐私"
      title="你的资料，先留在你的浏览器里"
      summary="Life Map 把出生资料视为敏感信息。当前公开测试版不建立账户、不使用分析追踪，也不把出生资料保存到 Life Map 服务器。"
    >
      <section>
        <h2>我们如何处理你输入的内容</h2>
        <p>
          你输入的称呼、出生日期、出生时间、所选出生地点，以及在问答中保存的问题与行动，只写入当前页面会话的
          <strong> sessionStorage（浏览器会话存储）</strong>。这些内容用于在你的设备上完成计算和显示页面。
        </p>
        <ul>
          <li>当前没有账号、云端同步或跨设备记忆。</li>
          <li>当前没有产品分析、广告追踪或实时 AI 请求。</li>
          <li>关闭相关页面会话后，浏览器通常会清除会话数据；浏览器的恢复功能可能暂时保留它。</li>
        </ul>
      </section>

      <section>
        <h2>地点搜索与必要的网络信息</h2>
        <p>
          只有你主动提交的城市或国家关键词会发送给 Open-Meteo 地点服务，用来返回城市、坐标和 IANA 时区。姓名、出生日期和出生时间不会包含在该请求中。
        </p>
        <p>
          与任何网络服务一样，Open-Meteo、托管服务商和网络运营方可能看到完成请求所需的普通技术信息，例如 IP 地址、浏览器类型和请求时间。请同时查看
          <a href="https://open-meteo.com/en/terms" target="_blank" rel="noreferrer"> Open-Meteo 条款</a>。
        </p>
      </section>

      <section>
        <h2>你可以控制什么</h2>
        <ul>
          <li>在「我的」页面选择“清除本次出生资料”。</li>
          <li>关闭页面会话，或使用浏览器设置清除网站数据。</li>
          <li>不要在反思问题中写入身份证件、医疗记录、财务账号或他人的敏感资料。</li>
        </ul>
        <aside>
          <p><strong>测试期说明：</strong>Shopify 购买入口已关闭，因此目前不会向 Shopify 发送订单或报告信息。未来开放销售前，本政策会先更新并再次说明资料边界。</p>
        </aside>
      </section>

      <section>
        <h2>联系我们</h2>
        <p>如需报告隐私问题，请前往<a href="/support">支持页面</a>。{publicSupportEmail ? <>当前公开邮箱是 <a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>；请勿通过邮件发送出生资料。</> : <>公开邮箱尚未启用，站点会在地址与处理流程验证完成前保持非公开。</>}</p>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
