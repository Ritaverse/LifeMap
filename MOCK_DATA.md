# Life Map — Mock Data Contract and Fixtures

## 1. Purpose

This document defines a TypeScript-friendly data contract and one coherent demo dataset for Phase 1.

All chart content below is **fictional fixture content**. It has not been calculated from the example birth details and must not be presented as a real reading. The fixture exists to validate information architecture, interactions, visual design, and explainability.

Implementation rules:

- Copy the types and fixtures into appropriate source modules; do not parse this Markdown at runtime.
- Keep fixtures separate from components.
- Use stable IDs for facts, evidence, insights, domains, products, and responses.
- Resolve references through selectors or a mock repository.
- Throw or surface a development warning when an evidence or recommendation reference is missing.
- Keep all demo outcomes deterministic.
- Numeric strength and activation values are internal layout/sorting aids. Do not display them as scientific confidence or fortune scores.

## 2. TypeScript Domain Model

```ts
export type SystemId = "bazi" | "ziwei" | "astrology";
export type DomainId =
  | "identity"
  | "career"
  | "wealth"
  | "love"
  | "family"
  | "relationships"
  | "creativity"
  | "inner-life";

export type ElementId = "wood" | "fire" | "earth" | "metal" | "water";
export type EvidenceRole = "primary" | "supporting" | "context";
export type SynthesisKind = "consensus" | "tension" | "distinct-signal";
export type DomainState = "active" | "steady" | "reflective" | "emerging";
export type IntentionId =
  | "new-beginning"
  | "focus"
  | "relationships"
  | "creativity"
  | "grounding"
  | "confidence";

export interface BirthLocation {
  label: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface BirthProfile {
  id: string;
  displayName: string;
  birthDate: string; // YYYY-MM-DD
  birthTime: string | null; // HH:mm local time
  birthTimeKnown: boolean;
  birthLocation: BirthLocation;
  traditionalRuleInput?: {
    gender?: "female" | "male" | "nonbinary" | "prefer-not-to-say";
    note: string;
  };
  locale: "zh-CN" | "zh-TW" | "en";
  timezone: string;
}

export interface ChartConventions {
  calculationStatus: "fixture-not-calculated" | "calculated";
  engineVersion: string;
  bazi: {
    yearBoundary: "lichun";
    monthBoundary: "solar-terms";
    dayBoundary: "23:00" | "00:00";
    timeBasis: "local-standard-time" | "true-solar-time";
  };
  ziwei: {
    school: string;
    directionRule: string;
  };
  astrology: {
    zodiac: "tropical" | "sidereal";
    houseSystem: "placidus" | "whole-sign" | "equal";
  };
}

export interface Pillar {
  label: "year" | "month" | "day" | "hour";
  stem: string;
  branch: string;
  hiddenStems: string[];
}

export interface ElementBalanceItem {
  element: ElementId;
  relativePresence: "lower" | "moderate" | "higher";
  internalWeight: number; // demo sorting only; never a user-facing score
}

export interface BaziChart {
  pillars: Pillar[];
  dayMaster: {
    stem: string;
    element: ElementId;
    polarity: "yin" | "yang";
  };
  elementBalance: ElementBalanceItem[];
  highlights: string[];
}

export interface ZiweiPalace {
  id: string;
  nameZh: string;
  nameEn: string;
  earthlyBranch: string;
  majorStars: string[];
  transformations: string[];
  summary: string;
}

export interface ZiweiChart {
  lifePalaceId: string;
  bodyPalaceId: string;
  fiveElementBureau: string;
  palaces: ZiweiPalace[];
}

export interface AstrologyPlacement {
  body: string;
  sign: string;
  house?: number;
  degreeLabel?: string;
}

export interface AstrologyAspect {
  bodyA: string;
  aspect: "conjunction" | "opposition" | "trine" | "square" | "sextile";
  bodyB: string;
  orbLabel?: string;
}

export interface AstrologyChart {
  placements: AstrologyPlacement[];
  aspects: AstrologyAspect[];
  angles: {
    ascendant: string;
    midheaven: string;
  };
}

export interface ChartFact {
  id: string;
  system: SystemId;
  domain: DomainId | "timing";
  scope: "natal" | "current-period";
  label: string;
  rawLabel: string;
  traditionalInterpretation: string;
  limitations?: string;
}

export interface ChartBundle {
  id: string;
  profileId: string;
  generatedAt: string;
  conventions: ChartConventions;
  bazi: BaziChart;
  ziwei: ZiweiChart;
  astrology: AstrologyChart;
  facts: ChartFact[];
}

export interface EvidenceRef {
  factId: string;
  system: SystemId;
  role: EvidenceRole;
  contribution: string;
}

export interface Insight {
  id: string;
  domain: DomainId | "timing";
  kind: SynthesisKind;
  eyebrow: string;
  title: string;
  subtitle: string;
  summary: string;
  evidence: EvidenceRef[];
  tensionNote?: string;
  reflectionPrompt: string;
  action?: {
    label: string;
    href: string;
  };
}

export interface LifeDomainSummary {
  id: DomainId;
  nameZh: string;
  nameEn: string;
  state: DomainState;
  pattern: string;
  summary: string;
  insightId: string;
  dimensions?: Array<{
    label: string;
    qualitativeValue: "low" | "medium" | "high" | "very-high";
    internalValue: number;
  }>;
}

export interface TimingSignal {
  id: string;
  domain: DomainId;
  label: string;
  qualitativeStrength: "quiet" | "present" | "active" | "very-active";
  internalStrength: number;
  summary: string;
  evidence: EvidenceRef[];
}

export interface TimingPeriod {
  id: string;
  profileId: string;
  title: string;
  start: string; // YYYY-MM
  end: string; // YYYY-MM
  nowPosition: number; // 0..1 for drawing only
  summary: string;
  nextTransition: {
    date: string;
    title: string;
    summary: string;
  };
  signals: TimingSignal[];
  disclaimer: string;
}

export type ProductCategory = "stone" | "bracelet" | "home-object" | "chart-art";

export interface Product {
  id: string;
  slug: string;
  category: ProductCategory;
  nameEn: string;
  nameZh: string;
  shortDescription: string;
  price: {
    amount: number;
    currency: "USD";
    display: string;
  };
  image: {
    src: string;
    alt: string;
    palette: string[];
  };
  associations: {
    elements: ElementId[];
    intentions: IntentionId[];
    themes: string[];
  };
  traditionalMeaning: string;
  dailyUse: string;
  material: string;
  origin: string;
  dimensions: string;
  care: string;
  featured: boolean;
  purchasable: false; // Phase 1 never checks out
}

export interface RecommendationReason {
  id: string;
  source: "birth-profile" | "current-timing" | "user-intention";
  label: string;
  explanation: string;
  factId?: string;
}

export interface ProductRecommendation {
  id: string;
  profileId: string;
  productId: string;
  intention: IntentionId;
  headline: string;
  summary: string;
  reasons: RecommendationReason[];
  nonCommercialPractice: {
    title: string;
    instruction: string;
  };
  disclaimer: string;
}

export type AskCategory =
  | "career-transition"
  | "relationship-pattern"
  | "new-beginning"
  | "internal-tension"
  | "general";

export interface AskResponse {
  id: string;
  category: AskCategory;
  suggestedPrompt: string;
  title: string;
  directAnswer: string;
  synthesisKind: SynthesisKind;
  sections: Array<{
    heading: string;
    body: string;
    evidence: EvidenceRef[];
  }>;
  reflectionQuestion: string;
  relatedDomain?: DomainId;
  disclaimer: string;
}

export type IChingLineValue = 6 | 7 | 8 | 9;

export interface IChingLine {
  position: 1 | 2 | 3 | 4 | 5 | 6; // bottom to top
  value: IChingLineValue;
  polarity: "yin" | "yang";
  moving: boolean;
  coinFaces: Array<"heads" | "tails">;
}

export interface HexagramSummary {
  number: number;
  nameZh: string;
  nameEn: string;
  upperTrigram: string;
  lowerTrigram: string;
}

export interface IChingResult {
  id: string;
  seed: string;
  sampleQuestion: string;
  lines: IChingLine[];
  primary: HexagramSummary;
  movingLineLabels: string[];
  relating?: HexagramSummary;
  originalTextLabel: string;
  originalTextExcerpt: string;
  plainLanguage: string;
  applicationToQuestion: string;
  reflectionPrompt: string;
  disclaimer: string;
}

export interface HomePayload {
  profileId: string;
  localizedDateLabel: string;
  greeting: string;
  todayInsightId: string;
  priorityDomainIds: DomainId[];
  currentPeriodId: string;
  symbol: {
    element: ElementId;
    nameZh: string;
    theme: string;
    description: string;
  };
  recommendationId: string;
  recentQuestions: string[];
}

export interface MockAppData {
  profile: BirthProfile;
  chart: ChartBundle;
  insights: Insight[];
  domains: LifeDomainSummary[];
  timing: TimingPeriod;
  products: Product[];
  recommendations: ProductRecommendation[];
  askResponses: AskResponse[];
  iching: IChingResult;
  home: HomePayload;
}
```

## 3. Example Profile and Chart

```ts
export const mockProfile: BirthProfile = {
  id: "profile-yu-demo",
  displayName: "Yu",
  birthDate: "1990-06-17",
  birthTime: "09:32",
  birthTimeKnown: true,
  birthLocation: {
    label: "Shanghai, China",
    city: "Shanghai",
    country: "China",
    latitude: 31.2304,
    longitude: 121.4737,
    timezone: "Asia/Shanghai",
  },
  traditionalRuleInput: {
    gender: "prefer-not-to-say",
    note: "Some traditional schools use this input to determine cycle direction. This demo does not calculate cycles.",
  },
  locale: "zh-CN",
  timezone: "America/Los_Angeles",
};

export const mockChart: ChartBundle = {
  id: "chart-yu-demo-v1",
  profileId: "profile-yu-demo",
  generatedAt: "2026-09-01T09:00:00-07:00",
  conventions: {
    calculationStatus: "fixture-not-calculated",
    engineVersion: "demo-fixture-1.0",
    bazi: {
      yearBoundary: "lichun",
      monthBoundary: "solar-terms",
      dayBoundary: "23:00",
      timeBasis: "local-standard-time",
    },
    ziwei: {
      school: "Demo convention only",
      directionRule: "Not calculated in Phase 1",
    },
    astrology: {
      zodiac: "tropical",
      houseSystem: "placidus",
    },
  },
  bazi: {
    pillars: [
      { label: "year", stem: "庚", branch: "午", hiddenStems: ["丁", "己"] },
      { label: "month", stem: "壬", branch: "午", hiddenStems: ["丁", "己"] },
      { label: "day", stem: "乙", branch: "卯", hiddenStems: ["乙"] },
      { label: "hour", stem: "辛", branch: "巳", hiddenStems: ["丙", "戊", "庚"] },
    ],
    dayMaster: { stem: "乙", element: "wood", polarity: "yin" },
    elementBalance: [
      { element: "wood", relativePresence: "lower", internalWeight: 0.34 },
      { element: "fire", relativePresence: "higher", internalWeight: 0.82 },
      { element: "earth", relativePresence: "moderate", internalWeight: 0.55 },
      { element: "metal", relativePresence: "moderate", internalWeight: 0.58 },
      { element: "water", relativePresence: "lower", internalWeight: 0.31 },
    ],
    highlights: [
      "柔韧与成长是长期主题",
      "表达冲动与结构要求之间存在张力",
      "自主空间会影响持续投入",
    ],
  },
  ziwei: {
    lifePalaceId: "ziwei-palace-life",
    bodyPalaceId: "ziwei-palace-career",
    fiveElementBureau: "木三局（演示数据）",
    palaces: [
      {
        id: "ziwei-palace-life",
        nameZh: "命宫",
        nameEn: "Life",
        earthlyBranch: "辰",
        majorStars: ["紫微", "七杀"],
        transformations: [],
        summary: "在传统解释中，这一组合常被用于讨论独立判断和承担复杂局面的倾向。",
      },
      {
        id: "ziwei-palace-career",
        nameZh: "官禄宫",
        nameEn: "Career",
        earthlyBranch: "申",
        majorStars: ["天机"],
        transformations: ["化权"],
        summary: "在传统解释中，天机化权常被用于讨论策略、变化与对决策权的需求。",
      },
      {
        id: "ziwei-palace-wealth",
        nameZh: "财帛宫",
        nameEn: "Wealth",
        earthlyBranch: "子",
        majorStars: ["天府"],
        transformations: [],
        summary: "在传统解释中，天府常被用于讨论资源管理、积累和稳定配置。",
      },
      {
        id: "ziwei-palace-relationships",
        nameZh: "夫妻宫",
        nameEn: "Partnership",
        earthlyBranch: "戌",
        majorStars: ["太阴"],
        transformations: [],
        summary: "在传统解释中，太阴常被用于讨论细腻、照顾与情绪安全感。",
      },
    ],
  },
  astrology: {
    placements: [
      { body: "Sun", sign: "Gemini", house: 11, degreeLabel: "演示位置" },
      { body: "Moon", sign: "Aquarius", house: 7, degreeLabel: "演示位置" },
      { body: "Mercury", sign: "Gemini", house: 11, degreeLabel: "演示位置" },
      { body: "Venus", sign: "Taurus", house: 10, degreeLabel: "演示位置" },
      { body: "Mars", sign: "Aries", house: 9, degreeLabel: "演示位置" },
      { body: "Saturn", sign: "Capricorn", house: 6, degreeLabel: "演示位置" },
      { body: "Uranus", sign: "Capricorn", house: 10, degreeLabel: "演示位置" },
    ],
    aspects: [
      { bodyA: "Sun", aspect: "trine", bodyB: "Moon", orbLabel: "演示相位" },
      { bodyA: "Moon", aspect: "square", bodyB: "Saturn", orbLabel: "演示相位" },
      { bodyA: "Mercury", aspect: "trine", bodyB: "Uranus", orbLabel: "演示相位" },
    ],
    angles: {
      ascendant: "Leo（演示位置）",
      midheaven: "Taurus（演示位置）",
    },
  },
  facts: [
    {
      id: "fact-bazi-daymaster-yi-wood",
      system: "bazi",
      domain: "identity",
      scope: "natal",
      label: "乙木日主",
      rawLabel: "Day Master: Yin Wood",
      traditionalInterpretation: "传统上常用来讨论柔韧、适应和持续生长的方式。",
    },
    {
      id: "fact-bazi-wood-relative-low",
      system: "bazi",
      domain: "inner-life",
      scope: "natal",
      label: "木的相对呈现较弱",
      rawLabel: "Relative Wood presence: lower",
      traditionalInterpretation: "这不是缺陷；在本演示解释中，它提示有意识地给成长、恢复和长期培育留出空间。",
      limitations: "元素权重是演示值，未经过真实排盘。",
    },
    {
      id: "fact-bazi-output-structure-tension",
      system: "bazi",
      domain: "career",
      scope: "natal",
      label: "表达动力与结构要求同时突出",
      rawLabel: "Demo pattern: expression × structure",
      traditionalInterpretation: "传统解释会把它看作创造冲动与规则、责任之间的持续协商。",
    },
    {
      id: "fact-bazi-current-month-focus",
      system: "bazi",
      domain: "timing",
      scope: "current-period",
      label: "当前月份强调取舍",
      rawLabel: "Demo monthly signal: focus and selection",
      traditionalInterpretation: "演示规则将这一时期解释为先收束资源、再决定投入方向。",
      limitations: "这是固定的产品文案夹具，并非真实流月计算。",
    },
    {
      id: "fact-ziwei-life-leadership",
      system: "ziwei",
      domain: "identity",
      scope: "natal",
      label: "命宫紫微、七杀",
      rawLabel: "Life Palace: Zi Wei + Qi Sha",
      traditionalInterpretation: "传统上常用于讨论自主判断、承担压力和重新组织局面的能力。",
    },
    {
      id: "fact-ziwei-career-tianji-authority",
      system: "ziwei",
      domain: "career",
      scope: "natal",
      label: "官禄宫天机化权",
      rawLabel: "Career Palace: Tian Ji transforms to Authority",
      traditionalInterpretation: "传统上常用于讨论策略、变化、复杂问题和对决策空间的重视。",
    },
    {
      id: "fact-ziwei-wealth-tianfu",
      system: "ziwei",
      domain: "wealth",
      scope: "natal",
      label: "财帛宫天府",
      rawLabel: "Wealth Palace: Tian Fu",
      traditionalInterpretation: "传统上常用于讨论资源管理、耐心积累和稳健配置。",
    },
    {
      id: "fact-ziwei-relationship-taiyin",
      system: "ziwei",
      domain: "relationships",
      scope: "natal",
      label: "夫妻宫太阴",
      rawLabel: "Partnership Palace: Tai Yin",
      traditionalInterpretation: "传统上常用于讨论照顾、细腻回应与情绪安全感。",
    },
    {
      id: "fact-ziwei-current-career-convergence",
      system: "ziwei",
      domain: "timing",
      scope: "current-period",
      label: "当前官禄主题集中",
      rawLabel: "Demo current Career Palace signal: convergence",
      traditionalInterpretation: "演示规则把这段时间表达为减少分散、明确优先级。",
      limitations: "这是固定的产品文案夹具，并非真实流年计算。",
    },
    {
      id: "fact-astro-sun-gemini-eleventh",
      system: "astrology",
      domain: "identity",
      scope: "natal",
      label: "太阳双子座，第十一宫",
      rawLabel: "Sun in Gemini, 11th House",
      traditionalInterpretation: "现代占星常将其与好奇、交流、网络和多重兴趣联系起来。",
    },
    {
      id: "fact-astro-uranus-tenth",
      system: "astrology",
      domain: "career",
      scope: "natal",
      label: "天王星第十宫",
      rawLabel: "Uranus in 10th House",
      traditionalInterpretation: "现代占星常将其与非线性职业路径、改革欲和对僵化角色的敏感联系起来。",
    },
    {
      id: "fact-astro-moon-saturn-square",
      system: "astrology",
      domain: "relationships",
      scope: "natal",
      label: "月亮与土星呈四分相",
      rawLabel: "Moon square Saturn",
      traditionalInterpretation: "现代占星常用它讨论情绪表达、责任和自我保护之间的张力。",
    },
    {
      id: "fact-astro-current-saturn-focus",
      system: "astrology",
      domain: "timing",
      scope: "current-period",
      label: "当前土星主题强调边界",
      rawLabel: "Demo transit signal: Saturn and boundaries",
      traditionalInterpretation: "演示解释把它用于讨论限制、责任和对承诺的筛选。",
      limitations: "这是固定的产品文案夹具，并非真实行运计算。",
    },
  ],
};
```

## 4. Insights and Life Domains

```ts
export const mockInsights: Insight[] = [
  {
    id: "insight-today-selection",
    domain: "timing",
    kind: "consensus",
    eyebrow: "今日主题",
    title: "收敛 · 选择",
    subtitle: "减少选择，比增加选择更重要",
    summary: "最近很多事情可能同时需要你的注意力。今天更适合先决定不做什么，再把精力留给真正重要的一件事。",
    evidence: [
      {
        factId: "fact-bazi-current-month-focus",
        system: "bazi",
        role: "primary",
        contribution: "把当前阶段描述为资源需要收束。",
      },
      {
        factId: "fact-ziwei-current-career-convergence",
        system: "ziwei",
        role: "primary",
        contribution: "同样强调优先级与减少分散。",
      },
      {
        factId: "fact-astro-current-saturn-focus",
        system: "astrology",
        role: "supporting",
        contribution: "从边界和承诺角度补充这一主题。",
      },
    ],
    reflectionPrompt: "如果今天只能保留一个承诺，你会保留哪一个？",
    action: { label: "和命盘深聊", href: "/ask?prompt=今天我该如何做取舍" },
  },
  {
    id: "insight-career-builder-explorer",
    domain: "career",
    kind: "consensus",
    eyebrow: "事业模式",
    title: "Builder × Explorer",
    subtitle: "你需要创造，也需要持续发现新的空间",
    summary: "你可能很享受把模糊的问题变成一个可以运作的东西；但当工作只剩重复维护时，投入感会下降。自主权往往比头衔更能决定你的长期动力。",
    evidence: [
      {
        factId: "fact-bazi-output-structure-tension",
        system: "bazi",
        role: "supporting",
        contribution: "显示创造表达与结构要求需要持续协调。",
      },
      {
        factId: "fact-ziwei-career-tianji-authority",
        system: "ziwei",
        role: "primary",
        contribution: "强调策略、变化和决策空间。",
      },
      {
        factId: "fact-astro-uranus-tenth",
        system: "astrology",
        role: "primary",
        contribution: "强调非线性路径和对僵化职业角色的敏感。",
      },
    ],
    reflectionPrompt: "你想离开的究竟是这份工作，还是其中缺少自主空间的部分？",
    action: { label: "问一个事业问题", href: "/ask?prompt=我现在的职业处于什么阶段" },
  },
  {
    id: "insight-identity-adaptive-leader",
    domain: "identity",
    kind: "tension",
    eyebrow: "自我模式",
    title: "柔韧的主导者",
    subtitle: "一边适应环境，一边希望保留最终判断",
    summary: "你可能看起来很会调整，但这不等于没有主见。真正的张力在于：你愿意协作，却不喜欢长期把关键判断交给别人。",
    evidence: [
      {
        factId: "fact-bazi-daymaster-yi-wood",
        system: "bazi",
        role: "primary",
        contribution: "提供柔韧与适应的主题。",
      },
      {
        factId: "fact-ziwei-life-leadership",
        system: "ziwei",
        role: "primary",
        contribution: "提供自主判断与承担复杂局面的主题。",
      },
      {
        factId: "fact-astro-sun-gemini-eleventh",
        system: "astrology",
        role: "context",
        contribution: "补充对交流、群体和多重视角的兴趣。",
      },
    ],
    tensionNote: "适应和主导并不矛盾；它们可能分别出现在探索阶段和最终决策阶段。",
    reflectionPrompt: "最近哪件事让你表面配合、内心却仍想保留决定权？",
  },
  {
    id: "insight-relationships-space-safety",
    domain: "relationships",
    kind: "tension",
    eyebrow: "关系模式",
    title: "空间与安全感",
    subtitle: "亲近和独立都需要被说出来",
    summary: "你可能既重视细腻回应，也需要足够的个人空间。没有说清楚时，一方容易把沉默理解为疏远，另一方则把追问感受为压力。",
    evidence: [
      {
        factId: "fact-ziwei-relationship-taiyin",
        system: "ziwei",
        role: "primary",
        contribution: "强调照顾和情绪安全。",
      },
      {
        factId: "fact-astro-moon-saturn-square",
        system: "astrology",
        role: "primary",
        contribution: "强调表达情绪与自我保护之间的拉扯。",
      },
    ],
    tensionNote: "这不是关系好坏判断，而是一个更适合被明确协商的需求差异。",
    reflectionPrompt: "你更希望对方理解你的哪一种需要：陪伴、空间，还是更清楚的承诺？",
  },
  {
    id: "insight-wealth-stewardship",
    domain: "wealth",
    kind: "distinct-signal",
    eyebrow: "财富模式",
    title: "先配置，再扩张",
    subtitle: "稳定来自清楚的资源边界",
    summary: "这里最明显的不是冒险或保守，而是对资源用途的掌控感。先明确基本盘，再给探索留出可承受的空间，可能更符合你的节奏。",
    evidence: [
      {
        factId: "fact-ziwei-wealth-tianfu",
        system: "ziwei",
        role: "primary",
        contribution: "提供资源管理和耐心积累的主题。",
      },
      {
        factId: "fact-bazi-output-structure-tension",
        system: "bazi",
        role: "context",
        contribution: "补充创造投入与结构边界之间的协调。",
      },
    ],
    reflectionPrompt: "哪一笔资源如果先划定边界，会让你更安心地尝试新东西？",
  },
];

export const mockDomains: LifeDomainSummary[] = [
  {
    id: "identity",
    nameZh: "自我",
    nameEn: "Identity",
    state: "steady",
    pattern: "柔韧的主导者",
    summary: "适应力与自主判断同时存在。",
    insightId: "insight-identity-adaptive-leader",
  },
  {
    id: "career",
    nameZh: "事业",
    nameEn: "Career",
    state: "active",
    pattern: "Builder × Explorer",
    summary: "创造、策略和自主空间是关键动力。",
    insightId: "insight-career-builder-explorer",
    dimensions: [
      { label: "自主性", qualitativeValue: "very-high", internalValue: 0.9 },
      { label: "稳定需求", qualitativeValue: "medium", internalValue: 0.55 },
      { label: "探索需求", qualitativeValue: "very-high", internalValue: 0.92 },
    ],
  },
  {
    id: "wealth",
    nameZh: "财富",
    nameEn: "Wealth",
    state: "steady",
    pattern: "先配置，再扩张",
    summary: "资源边界比短期刺激更重要。",
    insightId: "insight-wealth-stewardship",
  },
  {
    id: "love",
    nameZh: "爱情",
    nameEn: "Love",
    state: "reflective",
    pattern: "慢一点说清需要",
    summary: "亲近感来自被理解，也来自被允许保留空间。",
    insightId: "insight-relationships-space-safety",
  },
  {
    id: "family",
    nameZh: "家庭",
    nameEn: "Family",
    state: "steady",
    pattern: "责任与边界",
    summary: "照顾别人时，也需要明确自己的承受范围。",
    insightId: "insight-relationships-space-safety",
  },
  {
    id: "relationships",
    nameZh: "关系",
    nameEn: "Relationships",
    state: "reflective",
    pattern: "空间与安全感",
    summary: "未说出口的需要容易变成误解。",
    insightId: "insight-relationships-space-safety",
  },
  {
    id: "creativity",
    nameZh: "创造力",
    nameEn: "Creativity",
    state: "emerging",
    pattern: "把好奇变成作品",
    summary: "限制选择后，创造力更容易进入持续状态。",
    insightId: "insight-career-builder-explorer",
  },
  {
    id: "inner-life",
    nameZh: "内在成长",
    nameEn: "Inner Life",
    state: "active",
    pattern: "给成长留出恢复期",
    summary: "不是继续加速，而是建立可以反复回到的节奏。",
    insightId: "insight-identity-adaptive-leader",
  },
];
```

## 5. Timing Fixture

```ts
export const mockTiming: TimingPeriod = {
  id: "timing-reorientation-2026",
  profileId: "profile-yu-demo",
  title: "重新定义方向",
  start: "2026-07",
  end: "2027-02",
  nowPosition: 0.31,
  summary: "这段时间更像一次重新配置：减少分散的投入，辨认哪些承诺仍值得继续。",
  nextTransition: {
    date: "2027-03",
    title: "开始搭建新结构",
    summary: "演示时间轴把下一阶段描述为把已经明确的选择变成稳定日常。",
  },
  signals: [
    {
      id: "timing-signal-career",
      domain: "career",
      label: "事业",
      qualitativeStrength: "very-active",
      internalStrength: 0.88,
      summary: "取舍、角色边界和决策空间是当前重点。",
      evidence: [
        {
          factId: "fact-ziwei-current-career-convergence",
          system: "ziwei",
          role: "primary",
          contribution: "强调事业主题的集中。",
        },
        {
          factId: "fact-astro-current-saturn-focus",
          system: "astrology",
          role: "supporting",
          contribution: "补充责任和边界。",
        },
      ],
    },
    {
      id: "timing-signal-relationships",
      domain: "relationships",
      label: "关系",
      qualitativeStrength: "present",
      internalStrength: 0.52,
      summary: "适合把模糊期待转成具体沟通。",
      evidence: [
        {
          factId: "fact-astro-moon-saturn-square",
          system: "astrology",
          role: "context",
          contribution: "提供情绪表达和自我保护的长期背景。",
        },
      ],
    },
    {
      id: "timing-signal-creativity",
      domain: "creativity",
      label: "创造",
      qualitativeStrength: "active",
      internalStrength: 0.76,
      summary: "减少并行方向后，更容易形成连续作品。",
      evidence: [
        {
          factId: "fact-bazi-current-month-focus",
          system: "bazi",
          role: "supporting",
          contribution: "强调资源收束。",
        },
      ],
    },
    {
      id: "timing-signal-inner-life",
      domain: "inner-life",
      label: "内在",
      qualitativeStrength: "active",
      internalStrength: 0.71,
      summary: "需要更清楚地辨认哪些责任真正属于你。",
      evidence: [
        {
          factId: "fact-astro-current-saturn-focus",
          system: "astrology",
          role: "primary",
          contribution: "强调边界和承诺筛选。",
        },
      ],
    },
  ],
  disclaimer: "Activation 表示演示内容中的主题强调程度，不代表好运、坏运或确定结果。",
};
```

## 6. Product Catalog and Recommendation

Image paths are placeholders. Replace them with local prototype assets or an existing asset system; always keep meaningful alt text.

```ts
export const mockProducts: Product[] = [
  {
    id: "product-green-aventurine",
    slug: "green-aventurine",
    category: "stone",
    nameEn: "Green Aventurine",
    nameZh: "绿东陵石",
    shortDescription: "一件与成长、新开始和持续培育相呼应的日常象征物。",
    price: { amount: 38, currency: "USD", display: "$38" },
    image: {
      src: "/images/products/green-aventurine.jpg",
      alt: "一块置于浅色亚麻布上的天然绿东陵石",
      palette: ["#6F836E", "#C9C8B4", "#EDE7DA"],
    },
    associations: {
      elements: ["wood"],
      intentions: ["new-beginning", "creativity"],
      themes: ["成长", "新开始", "耐心培育"],
    },
    traditionalMeaning: "在现代水晶文化中，绿东陵石常被赋予成长、新机会和向前展开的象征意义。这些是文化与象征关联，不是可保证的功效。",
    dailyUse: "把它放在工作台或日记旁，在开始一天前写下今天唯一要持续培育的事情。",
    material: "天然石材；每件纹理与颜色会有差异（演示商品信息）",
    origin: "产地信息待真实供应链确认",
    dimensions: "约 35–50 mm（演示规格）",
    care: "以柔软干布清洁，避免化学清洁剂和长时间浸水。",
    featured: true,
    purchasable: false,
  },
  {
    id: "product-amethyst",
    slug: "amethyst",
    category: "stone",
    nameEn: "Amethyst",
    nameZh: "紫水晶",
    shortDescription: "与安静观察和专注仪式相关的象征物。",
    price: { amount: 42, currency: "USD", display: "$42" },
    image: {
      src: "/images/products/amethyst.jpg",
      alt: "自然光下的紫水晶原石",
      palette: ["#7E7188", "#C8BDC8", "#EEE8DF"],
    },
    associations: {
      elements: ["water"],
      intentions: ["focus", "grounding"],
      themes: ["观察", "专注", "安静"],
    },
    traditionalMeaning: "在现代水晶文化中常与安静、专注和反思联系在一起；不代表医疗或心理治疗效果。",
    dailyUse: "放在阅读或冥想空间，作为关闭额外干扰的视觉提示。",
    material: "天然石材（演示商品信息）",
    origin: "待确认",
    dimensions: "约 40 mm",
    care: "避免长时间强光照射。",
    featured: false,
    purchasable: false,
  },
  {
    id: "product-rose-quartz",
    slug: "rose-quartz",
    category: "stone",
    nameEn: "Rose Quartz",
    nameZh: "粉晶",
    shortDescription: "与温柔回应和关系意图相关的象征物。",
    price: { amount: 36, currency: "USD", display: "$36" },
    image: {
      src: "/images/products/rose-quartz.jpg",
      alt: "浅粉色粉晶置于米色石面上",
      palette: ["#C99F9C", "#E2C8C1", "#F2EAE0"],
    },
    associations: {
      elements: ["earth"],
      intentions: ["relationships"],
      themes: ["温柔", "回应", "关系"],
    },
    traditionalMeaning: "在现代水晶文化中常与温柔和关系意图联系，不保证带来或修复一段关系。",
    dailyUse: "把它放在写信或进行重要沟通的空间，提醒自己先表达需要而不是推测对方。",
    material: "天然石材（演示商品信息）",
    origin: "待确认",
    dimensions: "约 35 mm",
    care: "以柔软干布清洁。",
    featured: false,
    purchasable: false,
  },
  {
    id: "product-black-tourmaline",
    slug: "black-tourmaline",
    category: "stone",
    nameEn: "Black Tourmaline",
    nameZh: "黑碧玺",
    shortDescription: "一件与边界、落地和结束工作仪式相关的象征物。",
    price: { amount: 40, currency: "USD", display: "$40" },
    image: {
      src: "/images/products/black-tourmaline.jpg",
      alt: "深色黑碧玺原石置于木质托盘上",
      palette: ["#252522", "#77736A", "#D6CCBE"],
    },
    associations: {
      elements: ["water", "earth"],
      intentions: ["grounding", "focus"],
      themes: ["边界", "落地", "结束"],
    },
    traditionalMeaning: "在现代水晶文化中常与保护和边界联系；Life Map 只把它作为边界仪式的象征，不作安全保证。",
    dailyUse: "工作结束时把它移回托盘，作为停止处理工作信息的动作提示。",
    material: "天然石材（演示商品信息）",
    origin: "待确认",
    dimensions: "约 45 mm",
    care: "轻拿轻放，避免磕碰。",
    featured: false,
    purchasable: false,
  },
  {
    id: "product-five-elements-bracelet",
    slug: "five-elements-bracelet",
    category: "bracelet",
    nameEn: "Your Five Elements Bracelet",
    nameZh: "你的五行手链",
    shortDescription: "把个人主题和当前意图转化为可编辑的配色与材质组合。",
    price: { amount: 88, currency: "USD", display: "From $88" },
    image: {
      src: "/images/products/five-elements-bracelet.jpg",
      alt: "由五种克制色彩珠石组成的手链概念图",
      palette: ["#496B5D", "#A44738", "#B7A276", "#5D6062", "#405D6C"],
    },
    associations: {
      elements: ["wood", "fire", "earth", "metal", "water"],
      intentions: ["new-beginning", "focus", "relationships", "creativity", "grounding", "confidence"],
      themes: ["个人化", "日常仪式", "五行"],
    },
    traditionalMeaning: "未来版本会透明展示设计规则，并允许用户按审美与意图调整；不会宣称手链改变命运。",
    dailyUse: "佩戴时选择一个当天想实践的主题，而不是期待物品产生确定结果。",
    material: "概念商品；材质待真实供应链确认",
    origin: "待确认",
    dimensions: "按尺寸定制",
    care: "待真实材质确认后提供。",
    featured: false,
    purchasable: false,
  },
  {
    id: "product-focus-desk-set",
    slug: "focus-desk-set",
    category: "home-object",
    nameEn: "Focus Desk Set",
    nameZh: "专注桌面组合",
    shortDescription: "托盘、象征石与反思卡组成的桌面仪式概念。",
    price: { amount: 72, currency: "USD", display: "$72" },
    image: {
      src: "/images/products/focus-desk-set.jpg",
      alt: "木质托盘、天然石和小卡片组成的简洁桌面组合",
      palette: ["#8C7559", "#D8CEBE", "#496B5D"],
    },
    associations: {
      elements: ["wood", "earth"],
      intentions: ["focus", "grounding"],
      themes: ["专注", "桌面", "每日开始"],
    },
    traditionalMeaning: "这个组合借用元素和意图作为设计语言，不具有超自然或治疗保证。",
    dailyUse: "每天开始工作前，把当天唯一优先事项写在随附卡片上。",
    material: "概念商品；木、石、纸",
    origin: "待确认",
    dimensions: "待确认",
    care: "按各材质说明使用。",
    featured: false,
    purchasable: false,
  },
  {
    id: "product-chart-art",
    slug: "personal-life-map-art",
    category: "chart-art",
    nameEn: "Personal Life Map Art",
    nameZh: "个人命盘艺术画",
    shortDescription: "把四柱、圆盘与五行结构转化为克制的个性化艺术作品。",
    price: { amount: 64, currency: "USD", display: "From $64" },
    image: {
      src: "/images/products/chart-art.jpg",
      alt: "以圆、网格和四条竖线组成的米色极简命盘艺术画",
      palette: ["#F5F1E8", "#171714", "#496B5D", "#A44738"],
    },
    associations: {
      elements: ["wood", "fire", "earth", "metal", "water"],
      intentions: ["creativity", "confidence"],
      themes: ["个人故事", "艺术", "纪念"],
    },
    traditionalMeaning: "以用户的结构化命盘事实为视觉素材，定位为个性化艺术而非效果型产品。",
    dailyUse: "作为个人故事和反思主题的视觉纪念。",
    material: "数字文件或艺术纸印刷（概念商品）",
    origin: "按需制作",
    dimensions: "多种尺寸",
    care: "纸质版本避免潮湿和强光。",
    featured: false,
    purchasable: false,
  },
];

export const mockRecommendations: ProductRecommendation[] = [
  {
    id: "recommendation-growth-aventurine",
    profileId: "profile-yu-demo",
    productId: "product-green-aventurine",
    intention: "new-beginning",
    headline: "与你的「成长」主题呼应",
    summary: "这件物品把命盘中的成长主题、当前的收束阶段和你对新开始的意图连接在一起。它是一种象征选择，不是改变结果的工具。",
    reasons: [
      {
        id: "reason-profile-wood",
        source: "birth-profile",
        label: "个人主题 · Wood",
        explanation: "演示命盘把木描述为需要被有意识培育的主题，而不是需要被修复的缺陷。",
        factId: "fact-bazi-wood-relative-low",
      },
      {
        id: "reason-timing-selection",
        source: "current-timing",
        label: "当前阶段 · 收束",
        explanation: "当前主题建议先减少分散投入，再选择值得持续生长的方向。",
        factId: "fact-bazi-current-month-focus",
      },
      {
        id: "reason-intention-beginning",
        source: "user-intention",
        label: "你的意图 · 新开始",
        explanation: "你在演示流程中选择了“新开始”，因此推荐更强调成长和培育，而不是刺激或保护。",
      },
    ],
    nonCommercialPractice: {
      title: "先试一个不需要购买的仪式",
      instruction: "在纸上写下一个未来七天愿意持续培育的小行动，并划掉一个暂时不做的方向。",
    },
    disclaimer: "水晶和元素的关联来自传统及现代象征文化，不是科学功效或结果保证。",
  },
];
```

## 7. Ask Responses

```ts
export const mockAskResponses: AskResponse[] = [
  {
    id: "ask-career-transition",
    category: "career-transition",
    suggestedPrompt: "我现在的职业处于什么阶段？",
    title: "你可能正在从“证明能做”转向“选择值得做”",
    directAnswer: "现在最值得注意的，不一定是立刻离开或留下，而是你对自主空间、重复程度和长期投入的标准正在变得更清楚。",
    synthesisKind: "consensus",
    sections: [
      {
        heading: "三个体系共同出现的主题",
        body: "变化本身不是唯一重点。更一致的主题是：你需要把探索能力放进一个拥有真实决策空间的结构里。",
        evidence: [
          {
            factId: "fact-bazi-output-structure-tension",
            system: "bazi",
            role: "supporting",
            contribution: "提示表达和结构之间需要协调。",
          },
          {
            factId: "fact-ziwei-career-tianji-authority",
            system: "ziwei",
            role: "primary",
            contribution: "强调策略变化和决策空间。",
          },
          {
            factId: "fact-astro-uranus-tenth",
            system: "astrology",
            role: "primary",
            contribution: "强调非线性职业路径。",
          },
        ],
      },
      {
        heading: "当前阶段",
        body: "演示时间信号更支持先做减法：列出必须保留的条件，再判断现有角色能否被重新设计。",
        evidence: [
          {
            factId: "fact-bazi-current-month-focus",
            system: "bazi",
            role: "primary",
            contribution: "强调收束。",
          },
          {
            factId: "fact-astro-current-saturn-focus",
            system: "astrology",
            role: "supporting",
            contribution: "强调边界和承诺。",
          },
        ],
      },
    ],
    reflectionQuestion: "如果不换公司，你最希望先改变当前角色里的哪一个结构条件？",
    relatedDomain: "career",
    disclaimer: "这是基于演示命盘事实的反思性解释，不是职业或财务建议。",
  },
  {
    id: "ask-relationship-pattern",
    category: "relationship-pattern",
    suggestedPrompt: "为什么我和亲近的人总会重复类似的冲突？",
    title: "冲突可能发生在“需要靠近”和“需要空间”的翻译上",
    directAnswer: "你可能不是不重视关系，而是在压力下更倾向先整理自己；对方却可能把这种暂停理解为撤离。",
    synthesisKind: "tension",
    sections: [
      {
        heading: "关系中的两种需要",
        body: "一条线索强调细腻回应与安全感，另一条线索强调责任压力下的自我保护。重点不是哪一方正确，而是暂停需要被提前说明。",
        evidence: [
          {
            factId: "fact-ziwei-relationship-taiyin",
            system: "ziwei",
            role: "primary",
            contribution: "强调情绪回应和安全感。",
          },
          {
            factId: "fact-astro-moon-saturn-square",
            system: "astrology",
            role: "primary",
            contribution: "强调表达与保护之间的张力。",
          },
        ],
      },
    ],
    reflectionQuestion: "下一次需要空间时，你能否同时说明：需要多久、之后何时回来继续谈？",
    relatedDomain: "relationships",
    disclaimer: "这是反思提示，不替代伴侣沟通、咨询或安全支持。",
  },
  {
    id: "ask-new-beginning",
    category: "new-beginning",
    suggestedPrompt: "今年适合开始新的事情吗？",
    title: "可以先开始，但把“开始”定义得更小",
    directAnswer: "演示信号没有提供一个简单的是或否。它更支持先缩小范围，用一个可持续的小实验代替同时开启多个方向。",
    synthesisKind: "consensus",
    sections: [
      {
        heading: "为什么先做小实验",
        body: "当前主题同时强调收束、边界和清晰优先级。新开始不需要被取消，但需要一个明确的停止条件和复盘时间。",
        evidence: [
          {
            factId: "fact-bazi-current-month-focus",
            system: "bazi",
            role: "primary",
            contribution: "强调减少分散。",
          },
          {
            factId: "fact-ziwei-current-career-convergence",
            system: "ziwei",
            role: "primary",
            contribution: "强调集中。",
          },
          {
            factId: "fact-astro-current-saturn-focus",
            system: "astrology",
            role: "supporting",
            contribution: "强调边界和承诺。",
          },
        ],
      },
    ],
    reflectionQuestion: "什么是你可以在七天内完成、同时不要求自己承诺一整年的第一步？",
    relatedDomain: "creativity",
    disclaimer: "这是反思性解释，不是对项目结果的保证。",
  },
  {
    id: "ask-internal-tension",
    category: "internal-tension",
    suggestedPrompt: "我的命盘里最矛盾的地方是什么？",
    title: "你既会适应，也不愿放弃最终判断",
    directAnswer: "外在的灵活和内在的主导感可以同时存在。真正消耗你的，往往不是变化，而是长期适应一个自己无法影响的结构。",
    synthesisKind: "tension",
    sections: [
      {
        heading: "张力从哪里来",
        body: "八字演示事实强调柔韧，紫微演示事实强调自主承担，西方占星则补充对多重视角和群体连接的兴趣。你可能先充分听取意见，再在关键处坚持自己的判断。",
        evidence: [
          {
            factId: "fact-bazi-daymaster-yi-wood",
            system: "bazi",
            role: "primary",
            contribution: "强调柔韧适应。",
          },
          {
            factId: "fact-ziwei-life-leadership",
            system: "ziwei",
            role: "primary",
            contribution: "强调自主判断。",
          },
          {
            factId: "fact-astro-sun-gemini-eleventh",
            system: "astrology",
            role: "context",
            contribution: "补充多视角和群体兴趣。",
          },
        ],
      },
    ],
    reflectionQuestion: "最近一次妥协中，你让出的是做法，还是连最终判断也一起让出了？",
    relatedDomain: "identity",
    disclaimer: "这是基于演示事实的反思性解释。",
  },
  {
    id: "ask-general",
    category: "general",
    suggestedPrompt: "我现在最值得关注什么？",
    title: "先把问题缩小一点",
    directAnswer: "我可以结合演示命盘讨论事业、关系、新开始或内在张力。问题越具体，回答越容易和可见证据连接。",
    synthesisKind: "distinct-signal",
    sections: [],
    reflectionQuestion: "这件事最让你卡住的是选择、关系、时间，还是不知道自己真正想要什么？",
    disclaimer: "Phase 1 使用固定演示回答，不会调用实时 AI。",
  },
];
```

## 8. I Ching Fixture

Line values are listed **bottom to top**. The fixed sequence produces Hexagram 63, with line 2 moving, relating to Hexagram 5.

```ts
export const mockIChingResult: IChingResult = {
  id: "iching-demo-63-line-2",
  seed: "life-map-demo-seed-v1",
  sampleQuestion: "我是否应该接受这个新的工作机会？",
  lines: [
    { position: 1, value: 7, polarity: "yang", moving: false, coinFaces: ["heads", "heads", "tails"] },
    { position: 2, value: 6, polarity: "yin", moving: true, coinFaces: ["tails", "tails", "tails"] },
    { position: 3, value: 7, polarity: "yang", moving: false, coinFaces: ["heads", "heads", "tails"] },
    { position: 4, value: 8, polarity: "yin", moving: false, coinFaces: ["heads", "tails", "tails"] },
    { position: 5, value: 7, polarity: "yang", moving: false, coinFaces: ["heads", "heads", "tails"] },
    { position: 6, value: 8, polarity: "yin", moving: false, coinFaces: ["heads", "tails", "tails"] },
  ],
  primary: {
    number: 63,
    nameZh: "既济",
    nameEn: "After Completion",
    upperTrigram: "坎 / Water",
    lowerTrigram: "离 / Fire",
  },
  movingLineLabels: ["六二"],
  relating: {
    number: 5,
    nameZh: "需",
    nameEn: "Waiting",
    upperTrigram: "坎 / Water",
    lowerTrigram: "乾 / Heaven",
  },
  originalTextLabel: "六二",
  originalTextExcerpt: "妇丧其茀，勿逐，七日得。",
  plainLanguage: "事情看似已经具备条件，但并不要求你立刻追赶所有缺失的信息。先稳定位置，等待关键条件自然显现，可能比仓促补齐更重要。",
  applicationToQuestion: "对这个工作机会，这个卦不提供简单的接受或拒绝。它更像在提醒你：先确认目前缺少的关键条件——例如决策权、团队边界或时间承诺——是否会在短期内变得清楚，再做决定。",
  reflectionPrompt: "如果给自己七天，你最需要等到哪一项事实变清楚？",
  disclaimer: "I Ching 在这里是一种传统反思实践，不是对结果的保证，也不替代职业或财务判断。",
};
```

## 9. Home Payload

```ts
export const mockHome: HomePayload = {
  profileId: "profile-yu-demo",
  localizedDateLabel: "Tuesday · Sep 1",
  greeting: "晚上好，Yu",
  todayInsightId: "insight-today-selection",
  priorityDomainIds: ["identity", "career", "relationships", "wealth"],
  currentPeriodId: "timing-reorientation-2026",
  symbol: {
    element: "wood",
    nameZh: "木",
    theme: "成长 · 扩张 · 柔韧",
    description: "今天不需要同时长出更多枝条；先选择一条值得持续培育的方向。",
  },
  recommendationId: "recommendation-growth-aventurine",
  recentQuestions: [
    "我现在适合换工作吗？",
    "为什么我做一段时间后就想开始新的事情？",
  ],
};

export const mockAppData: MockAppData = {
  profile: mockProfile,
  chart: mockChart,
  insights: mockInsights,
  domains: mockDomains,
  timing: mockTiming,
  products: mockProducts,
  recommendations: mockRecommendations,
  askResponses: mockAskResponses,
  iching: mockIChingResult,
  home: mockHome,
};
```

## 10. Mock Repository Contract

The UI should depend on an interface like this rather than importing individual fixtures everywhere:

```ts
export interface LifeMapRepository {
  getProfile(profileId: string): Promise<BirthProfile>;
  getChart(profileId: string): Promise<ChartBundle>;
  getHome(profileId: string): Promise<HomePayload>;
  getInsight(insightId: string): Promise<Insight>;
  getResolvedEvidence(insightId: string): Promise<
    Array<EvidenceRef & { fact: ChartFact }>
  >;
  getDomains(profileId: string): Promise<LifeDomainSummary[]>;
  getDomain(domainId: DomainId): Promise<LifeDomainSummary>;
  getTiming(profileId: string): Promise<TimingPeriod>;
  listProducts(): Promise<Product[]>;
  getProduct(productIdOrSlug: string): Promise<Product>;
  getRecommendation(recommendationId: string): Promise<
    ProductRecommendation & { product: Product }
  >;
  ask(input: string): Promise<AskResponse>;
  getIChingDemo(): Promise<IChingResult>;
}
```

Recommended selector behavior:

- `getHome` resolves references at the page/view-model layer.
- `getResolvedEvidence` verifies that `EvidenceRef.system` matches the referenced fact’s system.
- `getRecommendation` verifies that all optional `factId` values exist.
- `ask` performs the deterministic keyword mapping specified in `MVP_PLAN.md`.
- Artificial latency, if used for visual states, should be short, deterministic, and disabled in tests.

## 11. Fixture Validation Checklist

- [ ] Every `profileId` resolves to the demo profile.
- [ ] Every insight evidence `factId` exists in `mockChart.facts`.
- [ ] Every evidence `system` matches its fact’s `system`.
- [ ] Every domain `insightId` exists.
- [ ] Every timing evidence reference exists.
- [ ] Every recommendation `productId` exists.
- [ ] Every recommendation reason `factId`, when present, exists.
- [ ] Home insight, timing, domain, and recommendation references all exist.
- [ ] I Ching lines are ordered bottom-to-top and moving-line metadata is consistent.
- [ ] No fixture is presented as a real calculation, live AI response, or purchasable inventory.

