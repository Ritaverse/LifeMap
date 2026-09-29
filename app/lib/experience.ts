import { calculateBazi } from "./bazi.ts";
import type { BaziReading, BirthProfileInput, FiveElement } from "./bazi.ts";
import { fiveElementLabel, palaceLabel, polarityLabel, timingLayerLabel } from "./chart-terminology.ts";
import { calculateWestern, calculateWesternTiming } from "./western.ts";
import type { WesternPlacement, WesternReading, WesternTimingReading } from "./western.ts";
import { calculateZiwei } from "./ziwei.ts";
import type { ZiweiReading } from "./ziwei.ts";
import { detectInputLocale, localized, type AppLocale } from "./locale.ts";
import type { AskResponse, ChartFact, DomainId, EvidenceRef, Insight, LifeDomain, SystemId, TimingPeriod } from "./types.ts";

export const EXPERIENCE_ENGINE = {
  id: "life-map-rules",
  version: "1.0.0",
  schemaVersion: "life-map.experience.v1",
} as const;

type MotifId = "exploration" | "structure" | "expression" | "relation" | "reflection" | "stewardship" | "initiative";

interface MotifCopy {
  title: string;
  subtitle: string;
  summary: string;
  prompt: string;
  practice: string;
}

export interface ExperienceTiming extends TimingPeriod {
  asOf: string;
  themeSubtitle: string;
  reflectionPrompt: string;
  practice: string;
  evidence: EvidenceRef[];
  facts: ChartFact[];
}

export interface CalculatedExperience {
  locale: AppLocale;
  schemaVersion: typeof EXPERIENCE_ENGINE.schemaVersion;
  engine: typeof EXPERIENCE_ENGINE;
  calculatedFor: string;
  bazi: BaziReading;
  ziwei: ZiweiReading;
  western: WesternReading;
  westernTiming: WesternTimingReading;
  facts: ChartFact[];
  todayInsight: Insight;
  domainInsights: Record<DomainId, Insight>;
  domains: LifeDomain[];
  timing: ExperienceTiming;
  limitations: string[];
}

export interface ChartExplanationPreview {
  system: SystemId;
  evidenceFactId: string | null;
  lines: [
    { label: string; text: string },
    { label: string; text: string },
    { label: string; text: string },
  ];
}

const domainOrder: DomainId[] = ["identity", "career", "wealth", "love", "family", "relationships", "creativity", "inner-life"];

const domainLabels: Record<DomainId, { zh: string; en: string; palace: string; planet: string }> = {
  identity: { zh: "自我", en: "Identity", palace: "命宫", planet: "Sun" },
  career: { zh: "事业", en: "Career", palace: "官禄", planet: "Midheaven" },
  wealth: { zh: "财富", en: "Wealth", palace: "财帛", planet: "Jupiter" },
  love: { zh: "爱情", en: "Love", palace: "夫妻", planet: "Venus" },
  family: { zh: "家庭", en: "Family", palace: "田宅", planet: "Moon" },
  relationships: { zh: "关系", en: "Relationships", palace: "仆役", planet: "Venus" },
  creativity: { zh: "创造力", en: "Creativity", palace: "子女", planet: "Mercury" },
  "inner-life": { zh: "内在成长", en: "Inner Life", palace: "福德", planet: "Moon" },
};

const motifCopy: Record<MotifId, Record<"zh" | "en", MotifCopy>> = {
  exploration: {
    zh: { title: "探索 · 重构", subtitle: "好奇心需要一个可以落地的方向", summary: "多个系统都指向开放、变化或重新组织经验的主题。它不要求你立刻换轨，更适合被当作一次缩小范围、验证方向的邀请。", prompt: "此刻最值得探索的，是一个新方向，还是旧方向里的新做法？", practice: "只保留一个七天内可以验证的小实验。" },
    en: { title: "Explore · Reframe", subtitle: "Give curiosity a direction you can test", summary: "Several systems point toward openness, change, or reorganizing experience. This is not a demand to change course; treat it as an invitation to narrow the field and test one direction.", prompt: "What is most worth exploring now: a new direction, or a new approach within the path you already have?", practice: "Keep one small experiment that you can test within seven days." },
  },
  structure: {
    zh: { title: "结构 · 边界", subtitle: "先让承诺变得清楚，再决定投入多少", summary: "计算事实共同强调秩序、判断或边界。这里的重点不是变得更严格，而是让时间、责任和期待更容易被看见。", prompt: "哪一条边界如果说清楚，会让你更安心地继续投入？", practice: "为今天最重要的承诺写下一条停止条件。" },
    en: { title: "Structure · Boundaries", subtitle: "Clarify the commitment before deciding how much to give", summary: "The calculated facts converge around order, discernment, or boundaries. The invitation is not to become rigid, but to make time, responsibility, and expectations easier to see.", prompt: "Which boundary, stated clearly, would help you continue with more steadiness?", practice: "Write one stopping condition for today’s most important commitment." },
  },
  expression: {
    zh: { title: "表达 · 被看见", subtitle: "把正在形成的想法说得更具体", summary: "多个系统在表达、可见度或沟通上出现交集。它不保证外界回应，但适合检查你是否已经让真实意图被理解。", prompt: "你真正想让别人理解的核心是什么？", practice: "把一段复杂想法压缩成三句可以被回应的话。" },
    en: { title: "Expression · Visibility", subtitle: "Make the idea taking shape more specific", summary: "Several systems overlap around expression, visibility, or communication. This cannot guarantee a response, but it can help you check whether your real intention is understandable.", prompt: "What is the one thing you most want another person to understand?", practice: "Reduce one complex idea to three sentences someone can respond to." },
  },
  relation: {
    zh: { title: "靠近 · 留白", subtitle: "关系需要回应，也需要可呼吸的边界", summary: "计算事实把注意力带到连接、照顾与互动方式。这里不是关系好坏判断，而是邀请你把需要说得比猜测更清楚。", prompt: "你现在更需要被陪伴、被理解，还是被允许拥有空间？", practice: "提出一个具体请求，同时说明你愿意提供的回应。" },
    en: { title: "Closeness · Space", subtitle: "Connection needs response and room to breathe", summary: "The calculated facts draw attention to connection, care, and ways of relating. This is not a judgment of a relationship; it is an invitation to state needs more clearly than assumptions.", prompt: "Do you need companionship, understanding, or permission to have space right now?", practice: "Make one specific request and name what you are willing to offer in return." },
  },
  reflection: {
    zh: { title: "观察 · 回应", subtitle: "先辨认感受，再决定下一步动作", summary: "多个系统共同强调感受、直觉或复盘。它不等于停滞，而是提醒你区分短暂反应与真正值得行动的信号。", prompt: "如果不急着解决，你最先注意到的真实感受是什么？", practice: "记录事实、感受、需要各一句，暂时不写结论。" },
    en: { title: "Observe · Respond", subtitle: "Name the feeling before choosing the next move", summary: "Several systems emphasize feeling, intuition, or review. This is not stagnation; it is a prompt to separate a passing reaction from a signal worth acting on.", prompt: "If you did not have to solve it yet, what feeling would you notice first?", practice: "Write one sentence each for fact, feeling, and need—without a conclusion." },
  },
  stewardship: {
    zh: { title: "资源 · 配置", subtitle: "稳住基本盘，再为变化留出空间", summary: "计算事实共同触及资源、承载与持续性。它不提供财务预测，更适合帮助你观察精力、时间与注意力如何被分配。", prompt: "哪一项资源需要先被保护，才能支持更长的路？", practice: "把今天的注意力预算分成必须、可选、暂缓三栏。" },
    en: { title: "Resources · Stewardship", subtitle: "Stabilize the base, then make room for change", summary: "The calculated facts touch resources, capacity, and continuity. This is not a financial forecast; use it to notice how energy, time, and attention are being allocated.", prompt: "Which resource needs protection first so it can support the longer path?", practice: "Divide today’s attention budget into must do, optional, and defer." },
  },
  initiative: {
    zh: { title: "启动 · 校准", subtitle: "先做一个动作，再用反馈修正方向", summary: "多个系统都出现主动、推进或转折的主题。它不代表一定要冒进，而是适合把抽象意图变成一个可撤回的小步骤。", prompt: "什么动作足够小，却能让你得到真实反馈？", practice: "完成一个十五分钟内可以结束的第一步。" },
    en: { title: "Begin · Calibrate", subtitle: "Take one action, then let feedback refine the direction", summary: "Several systems surface initiative, movement, or transition. This is not a reason to rush; it is a prompt to turn an abstract intention into one reversible step.", prompt: "What action is small enough to take, but real enough to give you useful feedback?", practice: "Complete a first step that can end within fifteen minutes." },
  },
};

function motif(id: MotifId, locale: AppLocale) {
  return motifCopy[id][locale === "zh-CN" ? "zh" : "en"];
}

const elementMotifs: Record<FiveElement, MotifId[]> = {
  木: ["exploration", "initiative"],
  火: ["expression", "initiative"],
  土: ["structure", "stewardship"],
  金: ["structure", "reflection"],
  水: ["reflection", "exploration"],
};

const starMotifs: Record<string, MotifId[]> = {
  紫微: ["stewardship", "structure"], 破军: ["exploration", "initiative"], 七杀: ["initiative", "structure"],
  天机: ["exploration", "reflection"], 太阳: ["expression", "initiative"], 武曲: ["structure", "stewardship"],
  天同: ["relation", "reflection"], 廉贞: ["expression", "structure"], 天府: ["stewardship", "structure"],
  太阴: ["relation", "reflection"], 贪狼: ["exploration", "expression"], 巨门: ["expression", "reflection"],
  天相: ["relation", "structure"], 天梁: ["reflection", "stewardship"],
};

const signMotifs: Record<string, MotifId[]> = {
  Aries: ["initiative", "expression"], Leo: ["expression", "initiative"], Sagittarius: ["exploration", "initiative"],
  Taurus: ["stewardship", "structure"], Virgo: ["structure", "reflection"], Capricorn: ["structure", "stewardship"],
  Gemini: ["exploration", "expression"], Libra: ["relation", "structure"], Aquarius: ["exploration", "reflection"],
  Cancer: ["relation", "reflection"], Scorpio: ["reflection", "initiative"], Pisces: ["reflection", "relation"],
};

const signZh: Record<string, string> = {
  Aries: "白羊", Taurus: "金牛", Gemini: "双子", Cancer: "巨蟹", Leo: "狮子", Virgo: "处女",
  Libra: "天秤", Scorpio: "天蝎", Sagittarius: "射手", Capricorn: "摩羯", Aquarius: "水瓶", Pisces: "双鱼",
};

const bodyZh: Record<string, string> = {
  Sun: "太阳", Moon: "月亮", Mercury: "水星", Venus: "金星", Mars: "火星", Jupiter: "木星", Saturn: "土星",
  Uranus: "天王星", Neptune: "海王星", Pluto: "冥王星", Ascendant: "上升点", Midheaven: "天顶", ASC: "上升点", MC: "天顶",
};

const aspectZh: Record<string, string> = {
  conjunction: "合相", sextile: "六合", square: "四分", trine: "三分", opposition: "对分",
};

function placementLabel(placement: WesternPlacement, locale: AppLocale) {
  const house = placement.house ? localized(locale, ` · 第 ${placement.house} 宫`, ` · House ${placement.house}`) : "";
  const body = localized(locale, bodyZh[placement.body] ?? placement.body, placement.body);
  const sign = localized(locale, signZh[placement.sign] ?? placement.sign, placement.sign);
  return `${body} ${sign} ${placement.degree}°${String(placement.minute).padStart(2, "0")}′${house}${placement.retrograde ? localized(locale, " · 逆行", " · retrograde") : ""}`;
}

function starInterpretation(stars: string[], locale: AppLocale) {
  if (!stars.length) return localized(locale, "该宫位没有十四主星坐守；传统上会结合对宫与三方四正阅读，本版不自动借星下结论。", "No major star occupies this palace. Traditional readings may consider the opposite palace and connected houses; this version does not borrow stars to manufacture a conclusion.");
  const motifs = [...new Set(stars.flatMap((star) => starMotifs[star] ?? ["reflection"]))];
  return localized(
    locale,
    `传统上常从${motifs.slice(0, 2).map((id) => motif(id, locale).title.split(" · ")[0]).join("、")}等角度阅读这些主星；这里保留为反思主题，不作性格定论。`,
    `These major stars are traditionally read through themes such as ${motifs.slice(0, 2).map((id) => motif(id, locale).title.split(" · ")[0].toLowerCase()).join(" and ")}. Here they remain prompts for reflection, not fixed personality claims.`,
  );
}

function westernInterpretation(placement: WesternPlacement, locale: AppLocale) {
  const motifs = signMotifs[placement.sign] ?? ["reflection"];
  return localized(
    locale,
    `热带黄道中，这一位置常被用于观察${motifs.map((id) => motif(id, locale).title.split(" · ")[0]).join("与")}；它是传统符号语言，不是心理测量。`,
    `In tropical astrology, this placement is traditionally used to reflect on ${motifs.map((id) => motif(id, locale).title.split(" · ")[0].toLowerCase()).join(" and ")}. It is symbolic language, not a psychological assessment.`,
  );
}

function baziInterpretation(element: FiveElement, domain: DomainId, locale: AppLocale) {
  const selected = motif(elementMotifs[element][domain === "career" || domain === "wealth" ? 1 : 0], locale);
  return localized(
    locale,
    `${element}在传统五行语言中可作为“${selected.title}”的观察角度；日主本身不等于人格标签，也不能单独推出吉凶。`,
    `In Five Elements tradition, ${fiveElementLabel(element, locale)} can be read through the lens “${selected.title}.” The Day Master is not a personality label and cannot determine fortune on its own.`,
  );
}

function palaceFor(ziwei: ZiweiReading, domain: DomainId) {
  const expected = domainLabels[domain].palace;
  return ziwei.palaces.find((palace) => palace.name === expected) ?? null;
}

function westernFor(western: WesternReading, domain: DomainId) {
  const body = domainLabels[domain].planet;
  if (body === "Midheaven") return western.angles.midheaven ?? western.placements.find((placement) => placement.body === "Saturn") ?? western.placements[0];
  return western.placements.find((placement) => placement.body === body) ?? western.placements[0];
}

function factSetForDomain(bazi: BaziReading, ziwei: ZiweiReading, western: WesternReading, domain: DomainId, locale: AppLocale) {
  const label = domainLabels[domain];
  const baziFact: ChartFact = {
    id: `fact-calculated-bazi-${domain}`,
    system: "bazi",
    domain,
    scope: "natal",
    label: localized(locale, `${bazi.dayMaster.polarity}${bazi.dayMaster.element}日主`, `Day Master ${bazi.dayMaster.stem} · ${polarityLabel(bazi.dayMaster.polarity, locale)} · ${fiveElementLabel(bazi.dayMaster.element, locale)}`),
    rawLabel: localized(locale, `日柱 ${bazi.pillars.day.ganZhi}；日主 ${bazi.dayMaster.stem}（${bazi.dayMaster.polarity}${bazi.dayMaster.element}）`, `Day Pillar ${bazi.pillars.day.ganZhi}; Day Master ${bazi.dayMaster.stem} · ${polarityLabel(bazi.dayMaster.polarity, locale)} · ${fiveElementLabel(bazi.dayMaster.element, locale)}`),
    traditionalInterpretation: baziInterpretation(bazi.dayMaster.element, domain, locale),
    limitations: localized(locale, "未计算旺衰、格局、喜用神或吉凶。", "Strength, structure, favorable elements, and fortune judgments are not calculated."),
  };

  const palace = palaceFor(ziwei, domain);
  const ziweiFact: ChartFact | null = palace ? {
    id: `fact-calculated-ziwei-${domain}`,
    system: "ziwei",
    domain,
    scope: "natal",
    label: localized(locale, `${label.palace} · ${palace.majorStars.map((star) => star.name).join("、") || "无主星"}`, `${palaceLabel(label.palace, locale)} · ${palace.majorStars.map((star) => star.name).join(", ") || "No major star"}`),
    rawLabel: localized(locale, `${label.palace}位于${palace.heavenlyStem}${palace.earthlyBranch}；主星 ${palace.majorStars.map((star) => `${star.name}${star.transformation ? `化${star.transformation}` : ""}`).join("、") || "无"}${palace.isBodyPalace ? "；同时为身宫" : ""}`, `${palaceLabel(label.palace, locale)} is at ${palace.heavenlyStem}${palace.earthlyBranch}; major stars: ${palace.majorStars.map((star) => `${star.name}${star.transformation ? ` (transformation ${star.transformation})` : ""}`).join(", ") || "none"}${palace.isBodyPalace ? "; also the Body Palace (身宫)" : ""}`),
    traditionalInterpretation: starInterpretation(palace.majorStars.map((star) => star.name), locale),
    limitations: localized(locale, "只使用本命宫位与主星事实；未自动判定格局、庙旺优劣或事件结果。", "Only natal palace and major-star facts are used. This version does not automatically judge configurations, dignity, or event outcomes."),
  } : null;

  const placement = westernFor(western, domain);
  const westernFact: ChartFact = {
    id: `fact-calculated-astrology-${domain}`,
    system: "astrology",
    domain,
    scope: "natal",
    label: placementLabel(placement, locale),
    rawLabel: localized(locale, `${placementLabel(placement, locale)}；黄经 ${placement.longitude.toFixed(2)}°`, `${placementLabel(placement, locale)}; ecliptic longitude ${placement.longitude.toFixed(2)}°`),
    traditionalInterpretation: westernInterpretation(placement, locale),
    limitations: western.completeness === "date-only-planets" ? localized(locale, "出生时间未知，未使用上升点、天顶或宫位。", "Birth time is unknown, so the Ascendant, Midheaven, and houses are not used.") : localized(locale, "采用热带黄道与整宫制。", "Uses the tropical zodiac and whole-sign houses."),
  };
  return [baziFact, ziweiFact, westernFact].filter((fact): fact is ChartFact => Boolean(fact));
}

function motifsForFact(fact: ChartFact, bazi: BaziReading, ziwei: ZiweiReading, western: WesternReading, domain: DomainId): MotifId[] {
  if (fact.system === "bazi") return elementMotifs[bazi.dayMaster.element];
  if (fact.system === "ziwei") return palaceFor(ziwei, domain)?.majorStars.flatMap((star) => starMotifs[star.name] ?? ["reflection"]) ?? ["reflection"];
  return signMotifs[westernFor(western, domain).sign] ?? ["reflection"];
}

function chooseMotif(facts: ChartFact[], bazi: BaziReading, ziwei: ZiweiReading, western: WesternReading, domain: DomainId) {
  const motifSystems = new Map<MotifId, Set<SystemId>>();
  for (const fact of facts) {
    for (const motif of motifsForFact(fact, bazi, ziwei, western, domain)) {
      const systems = motifSystems.get(motif) ?? new Set<SystemId>();
      systems.add(fact.system);
      motifSystems.set(motif, systems);
    }
  }
  const ranked = [...motifSystems.entries()].sort((left, right) => right[1].size - left[1].size || left[0].localeCompare(right[0]));
  return { motif: ranked[0]?.[0] ?? "reflection", systems: ranked[0]?.[1] ?? new Set<SystemId>() };
}

function buildDomainInsight(bazi: BaziReading, ziwei: ZiweiReading, western: WesternReading, domain: DomainId, facts: ChartFact[], locale: AppLocale): Insight {
  const domainFacts = facts.filter((fact) => fact.domain === domain && fact.scope === "natal");
  const selected = chooseMotif(domainFacts, bazi, ziwei, western, domain);
  const copy = motif(selected.motif, locale);
  const isConsensus = selected.systems.size >= 2;
  return {
    id: `calculated-${domain}`,
    domain,
    kind: isConsensus ? "consensus" : domainFacts.length > 1 ? "tension" : "distinct-signal",
    eyebrow: localized(locale, `${domainLabels[domain].zh} · 已计算`, `${domainLabels[domain].en} · Calculated`),
    title: copy.title,
    subtitle: copy.subtitle,
    summary: copy.summary,
    evidence: domainFacts.map((fact) => ({
      factId: fact.id,
      system: fact.system,
      role: selected.systems.has(fact.system) ? "primary" : "context",
      contribution: selected.systems.has(fact.system)
        ? localized(locale, `这条事实与“${copy.title}”主题直接相连。`, `This fact connects directly with the “${copy.title}” theme.`)
        : localized(locale, "这条事实提供不同角度，因此保留为背景而不强行平均。", "This fact offers a different angle, so it remains context instead of being averaged into a single answer."),
    })),
    tensionNote: isConsensus ? undefined : localized(locale, "各体系没有形成同一结论；这里保留它们的差异，只提供一个可继续观察的主题。", "The systems do not reach one conclusion. Their differences remain visible, with one theme offered for continued observation."),
    reflectionPrompt: copy.prompt,
  };
}

function timingDomainForNatalPoint(point: string): DomainId {
  if (point === "MC" || point === "Saturn") return "career";
  if (point === "Venus") return "relationships";
  if (point === "Moon") return "inner-life";
  if (point === "Mercury") return "creativity";
  return "identity";
}

function domainFromPalace(name: string): DomainId {
  return domainOrder.find((domain) => domainLabels[domain].palace === name) ?? "identity";
}

function monthEnd(targetDate: string) {
  const [year, month] = targetDate.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function nextMonth(targetDate: string) {
  const [year, month] = targetDate.split("-").map(Number);
  const value = new Date(Date.UTC(year, month, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildTiming(profile: BirthProfileInput, bazi: BaziReading, ziwei: ZiweiReading, western: WesternReading, westernTiming: WesternTimingReading, targetDate: string, locale: AppLocale): ExperienceTiming {
  const currentBazi = calculateBazi({ ...profile, displayName: profile.displayName || "Current", birthDate: targetDate, birthTime: "12:00", timeAccuracy: "known" });
  const currentMonthElement = currentBazi.pillars.month.elements[0];
  const baziFact: ChartFact = {
    id: "fact-calculated-bazi-current",
    system: "bazi",
    domain: "timing",
    scope: "current-period",
    label: localized(locale, `${currentBazi.pillars.year.ganZhi}年 · ${currentBazi.pillars.month.ganZhi}月`, `${currentBazi.pillars.year.ganZhi} year · ${currentBazi.pillars.month.ganZhi} month`),
    rawLabel: localized(locale, `目标日 ${targetDate} 的节气月柱为 ${currentBazi.pillars.month.ganZhi}，年柱为 ${currentBazi.pillars.year.ganZhi}`, `For ${targetDate}, the solar-term Month Pillar is ${currentBazi.pillars.month.ganZhi} and the Year Pillar is ${currentBazi.pillars.year.ganZhi}.`),
    traditionalInterpretation: localized(locale, `${currentMonthElement}可作为本月的传统象征背景；它不单独决定个人事件或吉凶。`, `${fiveElementLabel(currentMonthElement, locale)} can serve as this month’s traditional symbolic backdrop; it does not determine personal events or fortune on its own.`),
    limitations: localized(locale, "只显示公历目标日对应的干支年、月，不包含大运、流年作用关系或喜忌判断。", "Shows only the stem-branch year and month for the selected Gregorian date; decade cycles, annual interactions, and favorable-element judgments are not included."),
  };

  const yearly = ziwei.periods.find((period) => period.scope === "yearly");
  const monthly = ziwei.periods.find((period) => period.scope === "monthly");
  const ziweiFact: ChartFact | null = yearly && monthly ? {
    id: "fact-calculated-ziwei-current",
    system: "ziwei",
    domain: "timing",
    scope: "current-period",
    label: localized(locale, `${yearly.label} ${yearly.heavenlyStem}${yearly.earthlyBranch} · ${monthly.palaceName}`, `${timingLayerLabel(yearly.label, locale)} ${yearly.heavenlyStem}${yearly.earthlyBranch} · ${palaceLabel(monthly.palaceName, locale)}`),
    rawLabel: localized(locale, `${targetDate}：${yearly.label}落${yearly.palaceName}，${monthly.label}落${monthly.palaceName}；流年四化 ${yearly.transformations.join("、") || "无"}`, `${targetDate}: ${timingLayerLabel(yearly.label, locale)} is in ${palaceLabel(yearly.palaceName, locale)}; ${timingLayerLabel(monthly.label, locale)} is in ${palaceLabel(monthly.palaceName, locale)}; annual transformations: ${yearly.transformations.join(", ") || "none"}.`),
    traditionalInterpretation: localized(locale, "运限宫位可作为本期关注范围的传统索引；本版不把它转换成事件预言。", "Timing palaces can act as a traditional index of attention for this period. This version does not turn them into event predictions."),
    limitations: ziwei.conventions.directionRule === "not-applied" ? localized(locale, "未使用依赖传统性别输入的大限顺逆。", "Decade-cycle direction that depends on traditional gender input is not used.") : localized(locale, "显示大限以外的年、月层级事实。", "Shows annual and monthly facts in addition to the decade cycle."),
  } : null;

  const strongestTransit = westernTiming.transits[0];
  const westernFact: ChartFact | null = strongestTransit ? {
    id: "fact-calculated-astrology-current",
    system: "astrology",
    domain: "timing",
    scope: "current-period",
    label: localized(locale, `${bodyZh[strongestTransit.transitingBody] ?? strongestTransit.transitingBody}${aspectZh[strongestTransit.type]}本命${bodyZh[strongestTransit.natalPoint] ?? strongestTransit.natalPoint}`, `${strongestTransit.transitingBody} ${strongestTransit.type} natal ${strongestTransit.natalPoint}`),
    rawLabel: localized(locale, `${targetDate} 中午：容许度 ${strongestTransit.orb.toFixed(2)}°，${strongestTransit.phase === "applying" ? "入相" : strongestTransit.phase === "exact" ? "接近精确" : "出相"}${strongestTransit.retrograde ? "，行星逆行" : ""}`, `${targetDate} at noon: ${strongestTransit.orb.toFixed(2)}° orb, ${strongestTransit.phase}${strongestTransit.retrograde ? ", planet retrograde" : ""}.`),
    traditionalInterpretation: localized(locale, "行运相位在西方占星中常被用来选择反思主题；角距是计算事实，事件含义不是确定结论。", "Western astrology often uses transits to choose reflection themes. Angular distance is a calculated fact; event meaning is not a certain conclusion."),
    limitations: localized(locale, "只取目标日中午快照，不提供事件预测或精确应期。", "Uses a noon snapshot for the selected date and does not predict events or exact timing."),
  } : null;

  const facts = [baziFact, ziweiFact, westernFact].filter((fact): fact is ChartFact => Boolean(fact));
  const periodMotifs: MotifId[] = yearly?.transformations.flatMap((star) => starMotifs[star] ?? []) ?? [];
  const transitMotifs: MotifId[] = strongestTransit
    ? [strongestTransit.transitingBody === "Saturn" ? "structure" : strongestTransit.transitingBody === "Jupiter" || strongestTransit.transitingBody === "Uranus" ? "exploration" : strongestTransit.transitingBody === "Neptune" ? "reflection" : "initiative"]
    : [];
  const timingMotifs: MotifId[] = [
    elementMotifs[currentMonthElement][0],
    ...periodMotifs,
    ...transitMotifs,
  ];
  const motifCounts = timingMotifs.reduce((counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1), new Map<MotifId, number>());
  const selected = [...motifCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? "reflection";
  const copy = motif(selected, locale);
  const [year, month, day] = targetDate.split("-").map(Number);
  const signalDomains = [
    yearly ? domainFromPalace(yearly.palaceName) : "identity",
    monthly ? domainFromPalace(monthly.palaceName) : "inner-life",
    strongestTransit ? timingDomainForNatalPoint(strongestTransit.natalPoint) : "identity",
    "inner-life" as DomainId,
  ];
  const uniqueDomains = [...new Set(signalDomains)].slice(0, 4);
  while (uniqueDomains.length < 4) uniqueDomains.push(domainOrder.find((domain) => !uniqueDomains.includes(domain)) ?? "identity");
  const signals = uniqueDomains.map((domain, index) => ({
    id: `calculated-signal-${domain}`,
    domain,
    label: localized(locale, domainLabels[domain].zh, domainLabels[domain].en),
    strength: index === 0 ? "very-active" as const : index < 3 ? "active" as const : "present" as const,
    internalStrength: Math.max(0.46, 0.9 - index * 0.13),
    summary: index === 0
      ? localized(locale, `当前计算事实首先把注意力带到${domainLabels[domain].zh}。`, `The current calculated facts first draw attention to ${domainLabels[domain].en.toLowerCase()}.`)
      : localized(locale, "这是本期可以继续观察的次级主题，不代表好坏。", "This is a secondary theme to keep observing, not a positive or negative rating."),
  }));

  return {
    id: `calculated-timing-${targetDate.slice(0, 7)}`,
    asOf: targetDate,
    title: copy.title,
    themeSubtitle: copy.subtitle,
    reflectionPrompt: copy.prompt,
    practice: copy.practice,
    start: `${year}.${String(month).padStart(2, "0")}.01`,
    end: `${year}.${String(month).padStart(2, "0")}.${String(monthEnd(targetDate)).padStart(2, "0")}`,
    nowPosition: Math.max(0, Math.min(1, (day - 1) / Math.max(1, monthEnd(targetDate) - 1))),
    summary: localized(locale, `这是 ${targetDate} 的计算快照：${copy.summary}`, `This is a calculated snapshot for ${targetDate}: ${copy.summary}`),
    nextTransition: { date: nextMonth(targetDate), title: localized(locale, "重新计算月度快照", "Recalculate the monthly snapshot"), summary: localized(locale, "进入下一个公历月后，干支月、紫微流月与行星角距会重新计算。", "At the next Gregorian month, the stem-branch month, Zi Wei monthly palace, and planetary angles are recalculated.") },
    signals,
    disclaimer: localized(locale, "“活跃”只表示多个计算来源在同一生命领域留下可见线索，不是好运、坏运、概率或事件保证。", "“Active” only means that several calculated sources leave visible signals in one life domain. It is not good luck, bad luck, probability, or an event guarantee."),
    evidence: facts.map((fact, index) => ({ factId: fact.id, system: fact.system, role: index === 0 ? "primary" : "supporting", contribution: localized(locale, "提供当前日期对应的可复算事实。", "Provides a reproducible fact for the selected date.") })),
    facts,
  };
}

export function buildCalculatedExperience(bazi: BaziReading, targetDate: string, locale: AppLocale = "zh-CN"): CalculatedExperience {
  const profile = bazi.profile;
  const ziwei = calculateZiwei(profile, targetDate);
  const western = calculateWestern(profile);
  const westernTiming = calculateWesternTiming(profile, western, targetDate);
  const natalFacts = domainOrder.flatMap((domain) => factSetForDomain(bazi, ziwei, western, domain, locale));
  const domainInsights = Object.fromEntries(domainOrder.map((domain) => [domain, buildDomainInsight(bazi, ziwei, western, domain, natalFacts, locale)])) as Record<DomainId, Insight>;
  const domains = domainOrder.map((domain) => {
    const insight = domainInsights[domain];
    return {
      id: domain,
      nameZh: domainLabels[domain].zh,
      nameEn: domainLabels[domain].en,
      state: insight.kind === "consensus" ? "active" as const : insight.kind === "tension" ? "reflective" as const : "steady" as const,
      pattern: insight.title,
      summary: insight.subtitle,
      insightId: insight.id,
    };
  });
  const timing = buildTiming(profile, bazi, ziwei, western, westernTiming, targetDate, locale);
  const todayBase = domainInsights[timing.signals[0]?.domain ?? "identity"];
  const todayInsight: Insight = {
    ...todayBase,
    id: "calculated-today",
    domain: "timing",
    eyebrow: localized(locale, "今日综合 · 已计算", "Today’s synthesis · Calculated"),
    title: timing.title,
    subtitle: timing.themeSubtitle,
    evidence: timing.evidence,
    summary: timing.summary,
    reflectionPrompt: timing.reflectionPrompt,
  };
  const facts = [...natalFacts, ...timing.facts];
  const limitations = localized(locale,
    [...ziwei.caveats, ...western.caveats, ...westernTiming.caveats],
    [
      ziwei.status === "calculated"
        ? "Zi Wei palaces and major stars are calculated facts within a traditional interpretive system; they do not guarantee events or outcomes."
        : "Birth time is unknown, so the Zi Wei Life Palace, Body Palace, and twelve palaces are omitted rather than invented.",
      western.completeness === "timed-chart"
        ? "Western positions use a tropical zodiac and whole-sign houses; symbolic interpretation is not a scientific personality or outcome assessment."
        : "Birth time is unknown, so Western angles and houses are omitted while date-safe planetary positions remain available.",
      "Western timing uses a noon snapshot for the selected date. It identifies angular relationships for reflection and does not predict events.",
    ],
  );
  return {
    locale,
    schemaVersion: EXPERIENCE_ENGINE.schemaVersion,
    engine: EXPERIENCE_ENGINE,
    calculatedFor: targetDate,
    bazi,
    ziwei,
    western,
    westernTiming,
    facts,
    todayInsight,
    domainInsights,
    domains,
    timing,
    limitations,
  };
}

export function resolveCalculatedEvidence(experience: CalculatedExperience, evidence: EvidenceRef[]) {
  return evidence.map((reference) => {
    const fact = experience.facts.find((item) => item.id === reference.factId);
    if (!fact) throw new Error(`Missing calculated fact: ${reference.factId}`);
    if (fact.system !== reference.system) throw new Error(`Calculated evidence system mismatch: ${reference.factId}`);
    return { ...reference, fact };
  });
}

function completeSentence(value: string, locale: AppLocale) {
  const text = value.trim();
  return /[。！？.!?]$/.test(text) ? text : `${text}${locale === "zh-CN" ? "。" : "."}`;
}

export function getChartExplanationPreview(experience: CalculatedExperience, system: SystemId): ChartExplanationPreview {
  const locale = experience.locale;
  const fact = experience.facts.find((item) => item.system === system && item.scope === "natal" && item.domain === "identity");
  if (!fact) {
    if (system === "ziwei" && experience.ziwei.status === "unavailable") {
      return {
        system,
        evidenceFactId: null,
        lines: [
          { label: localized(locale, "图上事实", "Chart fact"), text: completeSentence(localized(locale, experience.ziwei.caveats[0] ?? "出生时间未知，紫微十二宫不进行推算", "Birth time is unknown, so the Zi Wei twelve-palace chart is not calculated"), locale) },
          { label: localized(locale, "阅读方式", "How to read it"), text: localized(locale, "没有可复算的宫位结构时，本页保留空白，不会用其他出生时间补造命宫或身宫。", "Without a reproducible palace structure, this space remains blank. Life Map will not invent a Life Palace or Body Palace using a substitute birth time.") },
          { label: localized(locale, "阅读边界", "Reading boundary"), text: localized(locale, "完整报告也会明确省略紫微十二宫，只使用当前可复算的八字、西占与时运事实。", "The full report will also omit the Zi Wei twelve palaces and use only the BaZi, Western, and timing facts that can be reproduced.") },
        ],
      };
    }
    throw new Error(`Missing ${system} identity fact for chart explanation`);
  }
  return {
    system,
    evidenceFactId: fact.id,
    lines: [
      { label: localized(locale, "图上事实", "Chart fact"), text: completeSentence(fact.rawLabel, locale) },
      { label: localized(locale, "传统观察", "Traditional lens"), text: completeSentence(fact.traditionalInterpretation, locale) },
      { label: localized(locale, "阅读边界", "Reading boundary"), text: completeSentence(fact.limitations ?? localized(locale, "这条事实只作为反思入口，不单独形成结果判断", "This fact is only an entry point for reflection and does not form an outcome judgment on its own"), locale) },
    ],
  };
}

export function routeCalculatedAsk(input: string, experience: CalculatedExperience, domainHint?: DomainId, requestedLocale?: AppLocale): AskResponse {
  const locale = requestedLocale ?? detectInputLocale(input, experience.locale);
  const localizedExperience = locale === experience.locale ? experience : buildCalculatedExperience(experience.bazi, experience.calculatedFor, locale);
  const normalized = input.toLowerCase();
  const category =
    /career|work|job|工作|职业|换工作/.test(normalized) ? "career-transition" :
    /relationship|partner|关系|感情|冲突/.test(normalized) ? "relationship-pattern" :
    /start|new|begin|开始|新项目/.test(normalized) ? "new-beginning" :
    /conflict|contradiction|矛盾|拉扯/.test(normalized) ? "internal-tension" : "general";
  const domain: DomainId = domainHint ?? (category === "career-transition" ? "career" : category === "relationship-pattern" ? "relationships" : category === "new-beginning" ? "creativity" : category === "internal-tension" ? "identity" : localizedExperience.todayInsight.domain === "timing" ? "identity" : localizedExperience.todayInsight.domain);
  const insight = localizedExperience.domainInsights[domain];
  return {
    id: `calculated-ask-${category}`,
    category,
    suggestedPrompt: input,
    title: insight.title,
    directAnswer: localized(locale, `${insight.subtitle}。${insight.summary}`, `${insight.subtitle}. ${insight.summary}`),
    kind: insight.kind,
    sections: [{ heading: localized(locale, "计算事实与规则综合", "Calculated facts and rule-based synthesis"), body: localized(locale, "下面每一条依据都来自当前浏览器内的真实排盘；综合文字由版本化规则生成，不会把不同体系平均成命运分数。", "Every item below comes from the chart calculated in this browser. Versioned rules create the synthesis without averaging different systems into a fate score."), evidence: insight.evidence }],
    reflectionQuestion: insight.reflectionPrompt,
    relatedDomain: domain,
    disclaimer: localized(locale, "这是基于传统体系计算事实的规则化反思，不是实时 AI、科学预测或专业建议。", "This is rule-based reflection grounded in calculated facts from traditional systems. It is not live AI, scientific prediction, or professional advice."),
    localizedFacts: localizedExperience.facts,
  };
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
