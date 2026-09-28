import type { CalculatedExperience, ChartExplanationPreview } from "./experience";
import type { AskResponse, DomainId, EvidenceRef, SystemId } from "./types";

export function resolveCalculatedEvidence(experience: CalculatedExperience, evidence: EvidenceRef[]) {
  return evidence.map((reference) => {
    const fact = experience.facts.find((item) => item.id === reference.factId);
    if (!fact) throw new Error(`Missing calculated fact: ${reference.factId}`);
    if (fact.system !== reference.system) throw new Error(`Calculated evidence system mismatch: ${reference.factId}`);
    return { ...reference, fact };
  });
}

function completeSentence(value: string) {
  const text = value.trim();
  return /[。！？.!?]$/.test(text) ? text : `${text}。`;
}

export function getChartExplanationPreview(experience: CalculatedExperience, system: SystemId): ChartExplanationPreview {
  const fact = experience.facts.find((item) => item.system === system && item.scope === "natal" && item.domain === "identity");
  if (!fact) {
    if (system === "ziwei" && experience.ziwei.status === "unavailable") {
      return {
        system,
        evidenceFactId: null,
        lines: [
          { label: "图上事实", text: completeSentence(experience.ziwei.caveats[0] ?? "出生时间未知，紫微十二宫不进行推算") },
          { label: "阅读方式", text: "没有可复算的宫位结构时，本页保留空白，不会用其他出生时间补造命宫或身宫。" },
          { label: "阅读边界", text: "完整报告也会明确省略紫微十二宫，只使用当前可复算的八字、西占与时运事实。" },
        ],
      };
    }
    throw new Error(`Missing ${system} identity fact for chart explanation`);
  }
  return {
    system,
    evidenceFactId: fact.id,
    lines: [
      { label: "图上事实", text: completeSentence(fact.rawLabel) },
      { label: "传统观察", text: completeSentence(fact.traditionalInterpretation) },
      { label: "阅读边界", text: completeSentence(fact.limitations ?? "这条事实只作为反思入口，不单独形成结果判断") },
    ],
  };
}

export function routeCalculatedAsk(input: string, experience: CalculatedExperience, domainHint?: DomainId): AskResponse {
  const normalized = input.toLowerCase();
  const category =
    /career|work|job|工作|职业|换工作/.test(normalized) ? "career-transition" :
    /relationship|partner|关系|感情|冲突/.test(normalized) ? "relationship-pattern" :
    /start|new|begin|开始|新项目/.test(normalized) ? "new-beginning" :
    /conflict|contradiction|矛盾|拉扯/.test(normalized) ? "internal-tension" : "general";
  const domain: DomainId = domainHint ?? (category === "career-transition" ? "career" : category === "relationship-pattern" ? "relationships" : category === "new-beginning" ? "creativity" : category === "internal-tension" ? "identity" : experience.todayInsight.domain === "timing" ? "identity" : experience.todayInsight.domain);
  const insight = experience.domainInsights[domain];
  return {
    id: `calculated-ask-${category}`,
    category,
    suggestedPrompt: input,
    title: insight.title,
    directAnswer: `${insight.subtitle}。${insight.summary}`,
    kind: insight.kind,
    sections: [{ heading: "计算事实与规则综合", body: "下面每一条依据都来自当前浏览器内的真实排盘；综合文字由版本化规则生成，不会把不同体系平均成命运分数。", evidence: insight.evidence }],
    reflectionQuestion: insight.reflectionPrompt,
    relatedDomain: domain,
    disclaimer: "这是基于传统体系计算事实的规则化反思，不是实时 AI、科学预测或专业建议。",
  };
}
