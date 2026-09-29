import type { FiveElement, PillarKind } from "./bazi.ts";
import type { AppLocale } from "./locale.ts";

export const fiveElementEnglish: Record<FiveElement, string> = {
  木: "Wood",
  火: "Fire",
  土: "Earth",
  金: "Metal",
  水: "Water",
};

const polarityEnglish = { 阳: "Yang", 阴: "Yin" } as const;

const pillarEnglish: Record<PillarKind, string> = {
  year: "Year Pillar",
  month: "Month Pillar",
  day: "Day Pillar",
  time: "Time Pillar",
};

const tenGodEnglish: Record<string, string> = {
  比肩: "Peer",
  劫财: "Rival",
  食神: "Eating God",
  伤官: "Hurting Officer",
  偏财: "Indirect Wealth",
  正财: "Direct Wealth",
  七杀: "Seven Killings",
  正官: "Direct Officer",
  偏印: "Indirect Resource",
  正印: "Direct Resource",
};

const palaceEnglish: Record<string, string> = {
  命宫: "Life Palace",
  兄弟: "Siblings Palace",
  夫妻: "Partnership Palace",
  子女: "Children & Creativity Palace",
  财帛: "Wealth Palace",
  疾厄: "Health Palace",
  迁移: "Travel Palace",
  仆役: "Community Palace",
  官禄: "Career Palace",
  田宅: "Home Palace",
  福德: "Inner Life Palace",
  父母: "Parents Palace",
};

const timingEnglish: Record<string, string> = {
  流年: "Annual cycle",
  流月: "Monthly cycle",
  大限: "Decade cycle",
};

export function fiveElementLabel(element: FiveElement, locale: AppLocale, includeChinese = true) {
  if (locale === "zh-CN") return element;
  return includeChinese ? `${fiveElementEnglish[element]} (${element})` : fiveElementEnglish[element];
}

export function polarityLabel(polarity: "阳" | "阴", locale: AppLocale, includeChinese = true) {
  if (locale === "zh-CN") return polarity;
  return includeChinese ? `${polarityEnglish[polarity]} (${polarity})` : polarityEnglish[polarity];
}

export function pillarLabel(kind: PillarKind, original: string, locale: AppLocale) {
  return locale === "zh-CN" ? original : `${pillarEnglish[kind]} (${original})`;
}

export function tenGodLabel(value: string, locale: AppLocale) {
  if (locale === "zh-CN") return value;
  const english = tenGodEnglish[value];
  return english ? `${english} (${value})` : value;
}

export function palaceLabel(value: string, locale: AppLocale) {
  if (locale === "zh-CN") return value;
  const english = palaceEnglish[value];
  return english ? `${english} (${value})` : value;
}

export function timingLayerLabel(value: string, locale: AppLocale) {
  if (locale === "zh-CN") return value;
  const english = timingEnglish[value];
  return english ? `${english} (${value})` : value;
}

export function baziCaveatLabel(value: string, locale: AppLocale) {
  if (locale === "zh-CN") return value;
  if (value.includes("真太阳时")) return "The Four Pillars use local civil time at the birthplace; true solar time correction is not applied.";
  if (value.includes("五行数量")) return "Five Elements counts cover only the eight visible stems and branches; they are not strength, favorable-element, or fortune scores.";
  if (value.includes("出生时间未知")) return "Birth time is unknown, so the Time Pillar is omitted; year or month pillars may also differ near a solar-term boundary.";
  return "This calculation note records a method boundary; it is not an outcome judgment.";
}
