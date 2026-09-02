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

export type EvidenceRole = "primary" | "supporting" | "context";
export type SynthesisKind = "consensus" | "tension" | "distinct-signal";
export type DomainState = "active" | "steady" | "reflective" | "emerging";

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
}

export interface LifeDomain {
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
  strength: "quiet" | "present" | "active" | "very-active";
  internalStrength: number;
  summary: string;
}

export interface TimingPeriod {
  id: string;
  title: string;
  start: string;
  end: string;
  nowPosition: number;
  summary: string;
  nextTransition: { date: string; title: string; summary: string };
  signals: TimingSignal[];
  disclaimer: string;
}

export interface Product {
  id: string;
  slug: string;
  category: "stone" | "bracelet" | "home-object" | "chart-art";
  nameEn: string;
  nameZh: string;
  shortDescription: string;
  price: string;
  palette: [string, string, string];
  elements: string[];
  intentions: string[];
  traditionalMeaning: string;
  dailyUse: string;
  material: string;
  origin: string;
  dimensions: string;
  care: string;
  featured: boolean;
}

export interface Recommendation {
  id: string;
  productId: string;
  headline: string;
  summary: string;
  reasons: Array<{
    id: string;
    source: "birth-profile" | "current-timing" | "user-intention";
    label: string;
    explanation: string;
    factId?: string;
  }>;
  nonCommercialPractice: { title: string; instruction: string };
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
  kind: SynthesisKind;
  sections: Array<{ heading: string; body: string; evidence: EvidenceRef[] }>;
  reflectionQuestion: string;
  relatedDomain?: DomainId;
  disclaimer: string;
}

export interface IChingLine {
  position: 1 | 2 | 3 | 4 | 5 | 6;
  value: 6 | 7 | 8 | 9;
  polarity: "yin" | "yang";
  moving: boolean;
  coinFaces: Array<"heads" | "tails">;
}

export interface IChingResult {
  id: string;
  sampleQuestion: string;
  lines: IChingLine[];
  primary: { number: number; nameZh: string; nameEn: string };
  relating?: { number: number; nameZh: string; nameEn: string };
  movingLineLabels: string[];
  originalTextLabel: string;
  originalTextExcerpt: string;
  plainLanguage: string;
  applicationToQuestion: string;
  reflectionPrompt: string;
  disclaimer: string;
}
