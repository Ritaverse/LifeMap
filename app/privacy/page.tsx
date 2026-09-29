import type { Metadata } from "next";
import { publicSupportEmail, publicSupportUrl } from "../lib/site-config";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "隐私政策",
  description: "了解 Life Map 如何在浏览器会话、私人报告交付与 Shopify 结账中保护出生资料。",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PublicTrustLayout
      currentPath="/privacy"
      eyebrow="Privacy · 隐私"
      title="你的资料，先留在你的浏览器里"
      summary="Life Map 把出生资料视为敏感信息。命盘计算与报告排版先在浏览器完成；只有你主动购买时，最终 PDF 才会上传到私人交付空间。"
    >
      <section>
        <h2>我们如何处理你输入的内容</h2>
        <p>
          你输入的称呼、出生日期、出生时间、所选出生地点，以及在问答中保存的问题与行动，只写入当前页面会话的
          <strong> sessionStorage（浏览器会话存储）</strong>。这些内容用于在你的设备上完成计算和显示页面。
        </p>
        <ul>
          <li>当前没有账号、云端同步或跨设备命盘档案。</li>
          <li>当前没有产品分析、广告追踪或实时 AI 请求。</li>
          <li>关闭相关页面会话后，浏览器通常会清除会话数据；浏览器的恢复功能可能暂时保留它。</li>
        </ul>
      </section>

      <section>
        <h2>购买报告时会发生什么</h2>
        <p>
          你主动选择完整报告后，浏览器会先生成十页 PDF，再把<strong>成品文件</strong>上传到 Life Map 的私人对象存储。数据库只保存随机报告编号、文件校验值、订单状态与到期时间，不保存出生表单或报告正文。
        </p>
        <ul>
          <li>未开始 Shopify 结账的 PDF 最多保留 24 小时；已创建结账的 PDF 最多保留 32 天，以覆盖 Shopify 最长 30 天的购物车有效期与 webhook 交付缓冲。</li>
          <li>付款成功后，报告从付款时起最多保留 30 天。</li>
          <li>退款、取消或到期会撤销下载并安排删除私人文件。</li>
          <li>购买邮箱会被加密用于发送下载邮件；数据库只保留不可逆的 keyed HMAC，用于订单恢复匹配。</li>
        </ul>
        <p>报告包含你的称呼、命盘事实与地点记录，因此请只在自己的设备上生成，并妥善保管下载文件。</p>
      </section>

      <section>
        <h2>Shopify 与邮件交付的边界</h2>
        <p>Shopify 只收到商品、数量、USD $2.00 金额和随机报告编号。姓名、出生日期、出生时间、出生地点、命盘事实、反思问题和 PDF 不会作为 Shopify 商品属性发送。</p>
        <p>Shopify 会按其政策处理结账所需的邮箱与付款资料。邮件服务商只收到购买邮箱、通用邮件文案与短期访问链接，不会收到报告内容。</p>
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
        <aside><p><strong>付费上线门槛：</strong>只有数据库、私人存储、Webhook、邮件、自动清理、支持与公开访问全部验证后，$2 购买按钮才会启用；否则不会创建订单。</p></aside>
      </section>

      <section>
        <h2>联系我们</h2>
        <p>如需报告隐私问题，请前往<a href="/support">支持页面</a>。{publicSupportEmail ? <>当前公开邮箱是 <a href={`mailto:${publicSupportEmail}`}>{publicSupportEmail}</a>；请勿通过邮件发送出生资料。</> : publicSupportUrl ? <>当前使用<a href={publicSupportUrl.toString()} rel="noreferrer">安全支持表单</a>；请勿发送出生资料。</> : <>公开支持渠道尚未启用，付费功能会保持关闭。</>}</p>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
