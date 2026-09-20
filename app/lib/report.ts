import type { BaziPillar, FiveElement } from "./bazi";
import type { CalculatedExperience } from "./experience";

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
  木: { title: "生长与调整的方式", body: "木常被用来讨论生长、方向与柔韧。这里把它当作观察语言，不是性格或未来的确定结论。", prompt: "什么值得继续培育？什么方向已经需要修枝？" },
  火: { title: "表达与可见度", body: "火常被用来讨论表达、热度与照亮他人。这里不把它等同于外向，也不据此预测结果。", prompt: "今天哪一件事值得被更清楚地表达？" },
  土: { title: "承载与稳定感", body: "土常被用来讨论承载、边界与整合。这里提供的是反思角度，不是能力或命运评分。", prompt: "你正在承载什么？其中哪一部分真正属于你？" },
  金: { title: "辨别与取舍", body: "金常被用来讨论界限、判断与精炼。这里不把取舍描述为吉凶，而是作为一个可练习的动作。", prompt: "如果只保留最重要的一项，你会留下什么？" },
  水: { title: "感知与流动", body: "水常被用来讨论感知、探索与流动。这里不预测变化，只邀请你观察信息如何进入与离开。", prompt: "什么问题值得再多听一会儿，而不是立刻回答？" },
};

const systemNames = { bazi: "八字", ziwei: "紫微", astrology: "西占" } as const;

function pillarLine(pillar: BaziPillar | null, fallback: string) {
  if (!pillar) return `${fallback}：出生时间未知，本报告不推算这一柱。`;
  return `${pillar.label} ${pillar.ganZhi}；天干 ${pillar.stem}，地支 ${pillar.branch}；表层五行 ${pillar.elements.join("、")}。`;
}

function formatGeneratedOn(value: Date | string) {
  const date = typeof value === "string" ? value : value.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Report date must use YYYY-MM-DD");
  return date;
}

export function buildLifeMapReport(experience: CalculatedExperience, generatedOn: Date | string = new Date()): LifeMapReport {
  const date = formatGeneratedOn(generatedOn);
  const { bazi, ziwei, western, timing, todayInsight } = experience;
  const lens = traditionalLenses[bazi.dayMaster.element];
  const elementSummary = Object.entries(bazi.visibleElementCounts).map(([element, count]) => `${element} ${count}`).join(" · ");
  const pillars = [
    pillarLine(bazi.pillars.year, "年柱"),
    pillarLine(bazi.pillars.month, "月柱"),
    pillarLine(bazi.pillars.day, "日柱"),
    pillarLine(bazi.pillars.time, "时柱"),
  ];
  const ziweiCore = ziwei.status === "calculated"
    ? `命宫在${ziwei.soulPalaceBranch}，身宫在${ziwei.bodyPalaceBranch}；命主 ${ziwei.soulStar}，身主 ${ziwei.bodyStar}；${ziwei.fiveElementsClass}。`
    : "出生时间未知：命宫、身宫与十二宫不进行推算。";
  const ziweiPalaces = ziwei.palaces.slice(0, 6).map((palace) => `${palace.name} ${palace.heavenlyStem}${palace.earthlyBranch}：${palace.majorStars.map((star) => star.name).join("、") || "无十四主星"}`).join("；");
  const westernCore = western.placements.slice(0, 5).map((placement) => `${placement.body} ${placement.sign} ${placement.degree}°${String(placement.minute).padStart(2, "0")}′${placement.house ? ` / H${placement.house}` : ""}`).join("；");
  const angles = western.angles.ascendant && western.angles.midheaven
    ? `上升 ${western.angles.ascendant.sign} ${western.angles.ascendant.degree}°；天顶 ${western.angles.midheaven.sign} ${western.angles.midheaven.degree}°。`
    : "出生时间未知：不推算上升点、天顶与宫位。";
  const strongestAspects = western.aspects.slice(0, 4).map((aspect) => `${aspect.bodyA} ${aspect.type} ${aspect.bodyB}（容许度 ${aspect.orb.toFixed(2)}°）`).join("；");
  const evidenceSystems = [...new Set(todayInsight.evidence.map((item) => systemNames[item.system]))].join("、");

  return {
    id: `life-map-report-${experience.schemaVersion}-${experience.calculatedFor}`,
    title: "完整跨体系每日反思报告",
    owner: bazi.profile.displayName,
    generatedOn: date,
    engineLabel: `${bazi.engine.id} v${bazi.engine.version} · ${ziwei.engine.id} v${ziwei.engine.version} · ${western.engine.id} v${western.engine.version} · ${experience.engine.id} v${experience.engine.version}`,
    disclaimer: "本报告用于个人反思与传统文化探索，不是科学预测，也不提供医疗、法律、财务、生育、死亡或安全建议。",
    pages: [
      {
        id: "cover", number: 1, eyebrow: "LIFE MAP · PRIVATE EDITION", title: `${bazi.profile.displayName} 的人生地图`,
        subtitle: "八字 × 紫微 × 西占 × 当前时运 × 可追溯规则综合",
        blocks: [
          { id: "cover-day-master", kind: "calculated-fact", label: "CALCULATED FACT", title: `日主 ${bazi.dayMaster.stem} · ${bazi.dayMaster.polarity}${bazi.dayMaster.element}`, body: `计算日期 ${experience.calculatedFor}；${ziwei.status === "calculated" ? "紫微十二宫完整" : "紫微因出生时间未知而省略"}；西占为${western.completeness === "timed-chart" ? "含宫位本命盘" : "日期行星盘"}。` },
          { id: "cover-boundary", kind: "methodology", label: "READING BOUNDARY", title: "事实、传统解释与规则综合分层", body: "天干地支、宫位星曜、行星黄经和角距属于计算事实；主题文字属于可质疑的传统反思，不是结果保证。" },
        ],
      },
      {
        id: "method", number: 2, eyebrow: "01 · METHOD", title: "这份报告如何生成", subtitle: "先计算，再连接证据；每一层都有边界。",
        blocks: [
          { id: "method-local", kind: "methodology", label: "PRIVATE BY DESIGN", title: "出生资料留在当前浏览器", body: "报告在浏览器会话内生成。购买时不会把姓名、出生日期、时间、地点或命盘内容发送给 Shopify。" },
          { id: "method-engines", kind: "calculated-fact", label: "VERSIONED ENGINES", title: "四套可复算输出", body: `${bazi.engine.id} v${bazi.engine.version}；${ziwei.engine.id} v${ziwei.engine.version}；${western.engine.id} v${western.engine.version}；${experience.engine.id} v${experience.engine.version}。` },
          { id: "method-synthesis", kind: "methodology", label: "RULE SYNTHESIS", title: "综合洞察不是实时 AI", body: "规则层只连接本报告中的稳定事实 ID。两个或以上体系指向同一主题时才标记共识；不一致时保留张力。" },
        ],
      },
      {
        id: "pillars", number: 3, eyebrow: "02 · BAZI", title: "四柱与表层五行", subtitle: elementSummary,
        blocks: [
          ...pillars.map((body, index) => ({ id: `pillar-${index + 1}`, kind: "calculated-fact" as const, label: "CALCULATED FACT", title: ["年柱", "月柱", "日柱", "时柱"][index], body })),
          { id: "elements-limit", kind: "methodology", label: "LIMITATION", title: "数量不是旺衰评分", body: "只统计可见天干与地支；不计算藏干权重、喜用神或吉凶，也不把数量较少描述成缺陷。" },
        ],
      },
      {
        id: "ziwei", number: 4, eyebrow: "03 · ZI WEI", title: "紫微十二宫", subtitle: ziwei.status === "calculated" ? `${ziwei.lunarDate} · ${ziwei.chineseDate}` : "出生时间不足，保留明确空值",
        blocks: [
          { id: "ziwei-core", kind: "calculated-fact", label: "CALCULATED FACT", title: "命宫、身宫与五行局", body: ziweiCore },
          { id: "ziwei-palaces", kind: "calculated-fact", label: "PALACE RECORD", title: "前六宫星曜记录", body: ziweiPalaces || "没有可显示的宫位记录。" },
          { id: "ziwei-boundary", kind: "methodology", label: "LIMITATION", title: "排盘事实不等于事件结论", body: ziwei.caveats.join(" ") },
        ],
      },
      {
        id: "western", number: 5, eyebrow: "04 · WESTERN NATAL", title: "西方本命盘", subtitle: "热带黄道 · 整宫制 · IANA 历史时区",
        blocks: [
          { id: "western-planets", kind: "calculated-fact", label: "PLANET POSITIONS", title: "主要行星位置", body: westernCore },
          { id: "western-angles", kind: "calculated-fact", label: "ANGLES", title: "角点与宫位", body: angles },
          { id: "western-aspects", kind: "calculated-fact", label: "ASPECTS", title: "最紧密主要相位", body: strongestAspects || "当前设置下没有主要相位进入容许度。" },
          { id: "western-boundary", kind: "methodology", label: "LIMITATION", title: "位置是计算，解释是传统语言", body: western.caveats.join(" ") },
        ],
      },
      {
        id: "timing", number: 6, eyebrow: "05 · CURRENT TIMING", title: `${experience.calculatedFor} · ${timing.title}`, subtitle: `${timing.start} — ${timing.end}`,
        blocks: [
          ...timing.facts.map((fact) => ({ id: `report-${fact.id}`, kind: "calculated-fact" as const, label: `${systemNames[fact.system]} · CURRENT FACT`, title: fact.label, body: `${fact.rawLabel}。${fact.limitations ?? ""}` })),
          { id: "timing-boundary", kind: "methodology", label: "TIMING BOUNDARY", title: "快照不是预言", body: timing.disclaimer },
        ],
      },
      {
        id: "synthesis", number: 7, eyebrow: "06 · SYNTHESIS", title: todayInsight.title, subtitle: todayInsight.subtitle,
        blocks: [
          { id: "synthesis-summary", kind: "traditional-reflection", label: `${todayInsight.kind.toUpperCase()} · ${evidenceSystems}`, title: "今日综合洞察", body: todayInsight.summary },
          ...todayInsight.evidence.map((reference) => {
            const fact = experience.facts.find((item) => item.id === reference.factId);
            if (!fact) throw new Error(`Missing report evidence: ${reference.factId}`);
            return { id: `synthesis-${fact.id}`, kind: "calculated-fact" as const, label: `${systemNames[fact.system]} · EVIDENCE`, title: fact.label, body: `${reference.contribution} ${fact.rawLabel}` };
          }),
          { id: "synthesis-prompt", kind: "practice", label: "REFLECTION PROMPT", title: todayInsight.reflectionPrompt, body: "先写下最直接的答案，再补一句：我有哪些现实事实支持这个感受？" },
        ],
      },
      {
        id: "domains", number: 8, eyebrow: "07 · LIFE DOMAINS", title: "八个生命领域", subtitle: "每个主题都来自同一组计算事实与版本化规则。",
        blocks: experience.domains.map((domain) => ({ id: `domain-${domain.id}`, kind: "traditional-reflection" as const, label: `${domain.nameEn.toUpperCase()} · ${domain.state.toUpperCase()}`, title: `${domain.nameZh} · ${domain.pattern}`, body: domain.summary })),
      },
      {
        id: "practice", number: 9, eyebrow: "08 · SEVEN-DAY PRACTICE", title: lens.title, subtitle: `围绕 ${bazi.dayMaster.polarity}${bazi.dayMaster.element} 与“${todayInsight.title}”的一周观察。`,
        blocks: [
          { id: "practice-lens", kind: "traditional-reflection", label: "TRADITIONAL LENS", title: "一种语言，不是一项判决", body: lens.body },
          { id: "practice-1", kind: "practice", label: "DAY 1–2", title: "观察", body: "每天记下一次能量最集中与最分散的时刻，不解释原因。" },
          { id: "practice-2", kind: "practice", label: "DAY 3–4", title: "验证", body: "选择一个小动作验证本周主题，保留随时撤回或修正的空间。" },
          { id: "practice-3", kind: "practice", label: "DAY 5–6", title: "表达", body: "向相关的人说清一个需要、一个边界或一个尚未确定的问题。" },
          { id: "practice-4", kind: "practice", label: "DAY 7", title: lens.prompt, body: "写下最可靠的一条现实观察，以及仍然无法确认的一点。" },
        ],
      },
      {
        id: "appendix", number: 10, eyebrow: "09 · NOTES & LIMITS", title: "计算记录与限制", subtitle: experience.schemaVersion,
        blocks: [
          ...experience.limitations.slice(0, 5).map((body, index) => ({ id: `caveat-${index + 1}`, kind: "methodology" as const, label: "CAVEAT", title: `限制 ${index + 1}`, body })),
          { id: "appendix-location", kind: "calculated-fact", label: "LOCATION RECORD", title: bazi.place.label, body: `${bazi.place.timeZone} · ${bazi.place.latitude.toFixed(4)}, ${bazi.place.longitude.toFixed(4)}。地点只在当前浏览器会话中用于计算。` },
          { id: "appendix-engine", kind: "calculated-fact", label: "ENGINE RECORD", title: experience.schemaVersion, body: `${bazi.schemaVersion} · ${ziwei.schemaVersion} · ${western.schemaVersion} · ${experience.schemaVersion}；${experience.engine.id} v${experience.engine.version}；计算日期 ${experience.calculatedFor}；报告日期 ${date}。` },
        ],
      },
    ],
  };
}
