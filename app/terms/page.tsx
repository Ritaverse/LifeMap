import type { Metadata } from "next";
import { PublicTrustLayout } from "../ui/PublicTrustLayout";

export const metadata: Metadata = {
  title: "Terms of Use · 使用条款",
  description: "Scope, reflective purpose, responsibility boundaries, and acceptable use for the Life Map public beta. Life Map 公开测试版使用说明。",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PublicTrustLayout
      currentPath="/terms"
      eyebrow="Terms · 使用条款"
      title="把它当作一面镜子，而不是答案机器"
      summary="使用 Life Map 即表示你理解：它结合传统命理与占星体系提供反思材料，不是科学测评、事实预测或专业建议。"
      eyebrowEn="Terms of Use"
      titleEn="Use it as a mirror, not an answer machine"
      summaryEn="By using Life Map, you understand that it combines traditional destiny and astrology systems as material for reflection—not scientific assessment, factual prediction, or professional advice."
      englishChildren={<>
        <section>
          <h2>What the service is</h2>
          <p>Life Map uses versioned deterministic calculations to present BaZi, Zi Wei Dou Shu, Western astrology, and current timing facts, then connects traditional observations and reflection prompts through rule templates. The current version does not call live AI.</p>
          <p>These systems have cultural and interpretive traditions, but they are not scientifically validated causal relationships. Themes, tendencies, and prompts on the site cannot guarantee an outcome.</p>
        </section>
        <section>
          <h2>Not a substitute for professional judgment</h2>
          <p>Life Map does not provide medical, mental-health, legal, financial, investment, fertility, safety, or emergency advice. Do not make high-risk decisions based only on chart, timing, astrology, or I Ching content. Contact a qualified professional or local emergency service when needed.</p>
        </section>
        <section>
          <h2>Use it responsibly</h2>
          <ul><li>Submit only information you have the right to use; do not enter another person’s sensitive information without permission.</li><li>Do not use the service to harass, deceive, or discriminate, or claim its content guarantees destiny or outcomes.</li><li>Do not disrupt, attack, reverse engineer, or automate abuse of the site or services.</li><li>Independently verify birth details and real-world information; incorrect input changes calculation results.</li></ul>
        </section>
        <section>
          <h2>Beta service and content rights</h2>
          <p>The public beta may change, pause, or remove features. Life Map interface, brand, explanatory copy, and original visuals are protected by applicable intellectual-property rules; you retain lawful rights in your own input.</p>
          <aside><p><strong>Digital report:</strong> the only paid report is a one-time ten-page PDF for USD $2.00, with no subscription or automatic renewal. Purchase opens only after payment verification, private delivery, recovery, refunds, and cleanup are ready.</p></aside>
        </section>
        <section>
          <h2>Changes and contact</h2>
          <p>Material changes will be reflected here before the relevant feature opens. Questions can be directed to the <a href="/support">support page</a>.</p>
          <p><time dateTime="2026-09-28">Updated September 28, 2026</time></p>
        </section>
      </>}
    >
      <section>
        <h2>服务是什么</h2>
        <p>
          Life Map 使用版本化的确定性计算呈现八字、紫微斗数、西方占星与当前时运事实，再通过规则模板连接传统观察与反思问题。当前版本不调用实时 AI。
        </p>
        <p>这些体系具有文化与解释传统，但不代表经科学验证的因果关系。页面上的主题、倾向和提示不能保证任何结果。</p>
      </section>

      <section>
        <h2>不能替代专业判断</h2>
        <p>
          Life Map 不提供医疗、心理健康、法律、财务、投资、生育、安全或紧急情况建议。不要仅依据命盘、时运、占星或易经内容作出高风险决定；需要时请联系合格专业人士或当地紧急服务。
        </p>
      </section>

      <section>
        <h2>负责任地使用</h2>
        <ul>
          <li>只提交你有权使用的资料，不要擅自输入他人的敏感信息。</li>
          <li>不要利用本服务骚扰、欺骗、歧视他人，或声称内容能保证命运与结果。</li>
          <li>不要干扰、逆向攻击或自动化滥用本网站及其服务。</li>
          <li>请独立核对出生资料与现实信息；输入错误会影响计算结果。</li>
        </ul>
      </section>

      <section>
        <h2>测试版与内容权利</h2>
        <p>
          公开测试版可能调整、暂停或移除功能。Life Map 的界面、品牌、说明文字和原创视觉受适用知识产权规则保护；你保留自己输入内容中的合法权利。
        </p>
        <aside><p><strong>数字报告：</strong>唯一付费报告为 USD $2.00 的一次性十页 PDF，没有订阅或自动续费。购买入口只有在付款验证、私人交付、恢复、退款和清理流程全部就绪后才会开放。</p></aside>
      </section>

      <section>
        <h2>变更与联系</h2>
        <p>如果条款发生重大变化，我们会在相关功能开放前更新本页。问题请查看 <a href="/support">支持页面</a>。</p>
        <p><time dateTime="2026-09-28">更新日期：2026 年 9 月 28 日</time></p>
      </section>
    </PublicTrustLayout>
  );
}
