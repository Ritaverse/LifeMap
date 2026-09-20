import type { BaziPillar, BaziReading, FiveElement } from "./bazi";

export type ReportContentKind = "calculated-fact" | "traditional-reflection" | "practice" | "methodology";

export interface ReportBlock {
  id: string;
  kind: ReportContentKind;
  label: string;
  title: string;
  body: string;
}

export interface ReportPage {
  id: string;
  number: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  blocks: ReportBlock[];
}

export interface LifeMapReport {
  id: string;
  title: string;
  owner: string;
  generatedOn: string;
  engineLabel: string;
  pages: ReportPage[];
  disclaimer: string;
}

const traditionalLenses: Record<FiveElement, { title: string; body: string; prompt: string }> = {
  木: {
    title: "生长与调整的方式",
    body: "在八字传统中，木常被用来讨论生长、方向与柔韧。这里把它当作观察语言，而不是对性格或未来的确定结论。",
    prompt: "什么值得继续培育？什么方向已经需要修枝？",
  },
  火: {
    title: "表达与可见度",
    body: "在八字传统中，火常被用来讨论表达、热度与照亮他人。这里不把它等同于外向，也不据此预测结果。",
    prompt: "今天哪一件事值得被更清楚地表达？",
  },
  土: {
    title: "承载与稳定感",
    body: "在八字传统中，土常被用来讨论承载、边界与整合。这里提供的是反思角度，不是对能力或命运的评分。",
    prompt: "你正在承载什么？其中哪一部分真正属于你？",
  },
  金: {
    title: "辨别与取舍",
    body: "在八字传统中，金常被用来讨论界限、判断与精炼。这里不把取舍描述为吉凶，而是作为一个可练习的动作。",
    prompt: "如果只保留最重要的一项，你会留下什么？",
  },
  水: {
    title: "感知与流动",
    body: "在八字传统中，水常被用来讨论感知、探索与流动。这里不预测变化，只邀请你观察信息如何进入与离开。",
    prompt: "什么问题值得再多听一会儿，而不是立刻回答？",
  },
};

function pillarLine(pillar: BaziPillar | null, fallback: string) {
  if (!pillar) return `${fallback}：出生时间未知，本报告不推算这一柱。`;
  return `${pillar.label} ${pillar.ganZhi}；天干 ${pillar.stem}，地支 ${pillar.branch}；表层五行 ${pillar.elements.join("、")}。`;
}

function formatGeneratedOn(value: Date | string) {
  const date = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Report date must use YYYY-MM-DD");
  return date;
}

export function buildLifeMapReport(reading: BaziReading, generatedOn: Date | string = new Date()): LifeMapReport {
  const date = formatGeneratedOn(generatedOn);
  const lens = traditionalLenses[reading.dayMaster.element];
  const elementSummary = Object.entries(reading.visibleElementCounts)
    .map(([element, count]) => `${element} ${count}`)
    .join(" · ");
  const pillars = [
    pillarLine(reading.pillars.year, "年柱"),
    pillarLine(reading.pillars.month, "月柱"),
    pillarLine(reading.pillars.day, "日柱"),
    pillarLine(reading.pillars.time, "时柱"),
  ];

  return {
    id: `life-map-report-${reading.schemaVersion}`,
    title: "完整每日反思报告",
    owner: reading.profile.displayName,
    generatedOn: date,
    engineLabel: `${reading.engine.id} v${reading.engine.version} · ${reading.schemaVersion}`,
    disclaimer: "本报告用于个人反思与传统文化探索，不是科学预测，也不提供医疗、法律、财务、生育、死亡或安全建议。",
    pages: [
      {
        id: "cover",
        number: 1,
        eyebrow: "LIFE MAP · PRIVATE EDITION",
        title: `${reading.profile.displayName} 的人生地图`,
        subtitle: "确定性四柱事实 × 克制的传统反思 × 可实践的日常问题",
        blocks: [
          { id: "cover-day-master", kind: "calculated-fact", label: "CALCULATED FACT", title: `日主 ${reading.dayMaster.stem} · ${reading.dayMaster.polarity}${reading.dayMaster.element}`, body: `四柱完整度：${reading.completeness === "four-pillars" ? "四柱完整" : "三柱暂定，时柱未知"}。` },
          { id: "cover-boundary", kind: "methodology", label: "READING BOUNDARY", title: "事实与解释分开阅读", body: "排盘事实由版本化引擎计算；传统主题是反思提示，不是从元素数量自动推导出的吉凶结论。" },
        ],
      },
      {
        id: "method",
        number: 2,
        eyebrow: "01 · HOW TO READ",
        title: "这份报告如何生成",
        subtitle: "先计算，再解释；每一层都有清楚边界。",
        blocks: [
          { id: "method-local", kind: "methodology", label: "PRIVATE BY DESIGN", title: "出生资料留在当前浏览器", body: "报告在浏览器会话内根据已保存资料生成。购买时不会把姓名、出生日期、时间、地点或命盘内容发送给 Shopify。" },
          { id: "method-engine", kind: "calculated-fact", label: "ENGINE", title: "版本化四柱计算", body: `${reading.engine.id} v${reading.engine.version}；年界采用立春，月界采用节气中的“节”，日界采用出生地当地民用时间 00:00。` },
          { id: "method-scope", kind: "methodology", label: "CURRENT SCOPE", title: "本版只把八字视为真实计算", body: "紫微斗数、西方占星、真实时运与实时 AI 尚未进入此报告，不会伪装成已计算结论。" },
        ],
      },
      {
        id: "pillars",
        number: 3,
        eyebrow: "02 · FOUR PILLARS",
        title: "你的四柱结构",
        subtitle: "这里记录引擎事实，不替你定义个性或未来。",
        blocks: pillars.map((body, index) => ({
          id: `pillar-${index + 1}`,
          kind: "calculated-fact" as const,
          label: "CALCULATED FACT",
          title: ["年柱", "月柱", "日柱", "时柱"][index],
          body,
        })),
      },
      {
        id: "elements",
        number: 4,
        eyebrow: "03 · VISIBLE ELEMENTS",
        title: "表层五行分布",
        subtitle: elementSummary,
        blocks: [
          { id: "elements-count", kind: "calculated-fact", label: "CALCULATED FACT", title: "八个干支中的出现次数", body: `${elementSummary}。数量只统计可见天干与地支；不知道出生时间时，合计少于八。` },
          { id: "elements-limit", kind: "methodology", label: "LIMITATION", title: "数量不是旺衰评分", body: "本阶段不计算藏干权重、季节旺衰、喜用神或吉凶，也不会把某一元素数量较少描述成缺陷。" },
        ],
      },
      {
        id: "lens",
        number: 5,
        eyebrow: "04 · TRADITIONAL LENS",
        title: lens.title,
        subtitle: `围绕 ${reading.dayMaster.polarity}${reading.dayMaster.element} 日主的一种传统观察角度。`,
        blocks: [
          { id: "lens-context", kind: "traditional-reflection", label: "TRADITIONAL REFLECTION", title: "一种语言，不是一项判决", body: lens.body },
          { id: "lens-prompt", kind: "practice", label: "REFLECTION PROMPT", title: lens.prompt, body: "先写下最直接的答案，再补一句：我有哪些事实支持这个感受？" },
        ],
      },
      {
        id: "practice",
        number: 6,
        eyebrow: "05 · SEVEN-DAY PRACTICE",
        title: "把观察带进七天",
        subtitle: "一次只做一个小动作，不需要购买任何象征物。",
        blocks: [
          { id: "practice-1", kind: "practice", label: "DAY 1–2", title: "观察", body: "每天记下一次能量最集中与最分散的时刻，不解释原因。" },
          { id: "practice-2", kind: "practice", label: "DAY 3–4", title: "取舍", body: "暂停一个低价值承诺，把空出的时间留给当前最重要的一件事。" },
          { id: "practice-3", kind: "practice", label: "DAY 5–6", title: "表达", body: "向相关的人说清一个需要、一个边界或一个尚未确定的问题。" },
          { id: "practice-4", kind: "practice", label: "DAY 7", title: "回看", body: "写下本周最可靠的一条自我观察，以及仍然无法确认的一点。" },
        ],
      },
      {
        id: "journal",
        number: 7,
        eyebrow: "06 · JOURNAL",
        title: "留给你的空白",
        subtitle: "反思不需要马上变成答案。",
        blocks: [
          { id: "journal-1", kind: "practice", label: "PROMPT 01", title: "我正在收敛什么？", body: "____________________________________________________________" },
          { id: "journal-2", kind: "practice", label: "PROMPT 02", title: "什么值得继续培育？", body: "____________________________________________________________" },
          { id: "journal-3", kind: "practice", label: "PROMPT 03", title: "哪一个判断仍需要更多现实证据？", body: "____________________________________________________________" },
        ],
      },
      {
        id: "appendix",
        number: 8,
        eyebrow: "07 · NOTES & LIMITS",
        title: "计算说明与限制",
        subtitle: reading.engine.version,
        blocks: [
          ...reading.caveats.map((body, index) => ({ id: `caveat-${index + 1}`, kind: "methodology" as const, label: "CAVEAT", title: `限制 ${index + 1}`, body })),
          { id: "appendix-location", kind: "calculated-fact", label: "LOCATION RECORD", title: reading.place.label, body: `${reading.place.timeZone} · ${reading.place.latitude.toFixed(4)}, ${reading.place.longitude.toFixed(4)}。地点仅用于当前会话中的计算与显示。` },
          { id: "appendix-engine", kind: "calculated-fact", label: "ENGINE RECORD", title: reading.schemaVersion, body: `${reading.engine.id} v${reading.engine.version}。报告日期 ${date}。` },
        ],
      },
    ],
  };
}
