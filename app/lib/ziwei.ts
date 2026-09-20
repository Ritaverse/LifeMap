import { astro } from "iztro";
import type { BirthProfileInput } from "./bazi.ts";

export const ZIWEI_ENGINE = {
  id: "iztro",
  version: "2.6.1",
  schemaVersion: "life-map.ziwei.v1",
  school: "iztro-default",
} as const;

export interface ZiweiStar {
  name: string;
  brightness: string | null;
  transformation: string | null;
}

export interface ZiweiPalace {
  id: string;
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: ZiweiStar[];
  minorStars: ZiweiStar[];
}

export interface ZiweiPeriodFact {
  scope: "decadal" | "yearly" | "monthly" | "daily";
  label: string;
  heavenlyStem: string;
  earthlyBranch: string;
  palaceName: string;
  transformations: string[];
}

export interface ZiweiReading {
  schemaVersion: typeof ZIWEI_ENGINE.schemaVersion;
  engine: typeof ZIWEI_ENGINE;
  status: "calculated" | "unavailable";
  completeness: "natal-and-periods" | "natal-with-neutral-periods" | "unavailable-unknown-time";
  calculatedFor: string;
  timeIndex: number | null;
  lunarDate: string | null;
  chineseDate: string | null;
  zodiac: string | null;
  soulPalaceBranch: string | null;
  bodyPalaceBranch: string | null;
  soulStar: string | null;
  bodyStar: string | null;
  fiveElementsClass: string | null;
  palaces: ZiweiPalace[];
  periods: ZiweiPeriodFact[];
  conventions: {
    calendarInput: "Gregorian";
    leapMonthAdjustment: true;
    language: "zh-CN";
    directionRule: "traditional-gender" | "not-applied";
  };
  caveats: string[];
}

function parseTimeIndex(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new Error("Zi Wei birth time must use HH:MM");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Zi Wei birth time is invalid");
  return hour === 23 ? 12 : Math.floor((hour + 1) / 2);
}

function normalizeDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Zi Wei date must use YYYY-MM-DD");
  return `${Number(match[1])}-${Number(match[2])}-${Number(match[3])}`;
}

function starValue(star: { name: unknown; brightness?: unknown; mutagen?: unknown }): ZiweiStar {
  return {
    name: String(star.name),
    brightness: star.brightness ? String(star.brightness) : null,
    transformation: star.mutagen ? String(star.mutagen) : null,
  };
}

function palaceValue(palace: {
  index: number;
  name: unknown;
  heavenlyStem: unknown;
  earthlyBranch: unknown;
  isBodyPalace: boolean;
  majorStars: Array<{ name: unknown; brightness?: unknown; mutagen?: unknown }>;
  minorStars: Array<{ name: unknown; brightness?: unknown; mutagen?: unknown }>;
}): ZiweiPalace {
  return {
    id: `ziwei-palace-${palace.index}`,
    index: palace.index,
    name: String(palace.name),
    heavenlyStem: String(palace.heavenlyStem),
    earthlyBranch: String(palace.earthlyBranch),
    isBodyPalace: palace.isBodyPalace,
    majorStars: palace.majorStars.map(starValue),
    minorStars: palace.minorStars.map(starValue),
  };
}

function coreSignature(chart: ReturnType<typeof astro.bySolar>) {
  return JSON.stringify({
    soulPalace: chart.earthlyBranchOfSoulPalace,
    bodyPalace: chart.earthlyBranchOfBodyPalace,
    soul: chart.soul,
    body: chart.body,
    fiveElementsClass: chart.fiveElementsClass,
    palaces: chart.palaces.map((palace) => ({
      name: palace.name,
      stem: palace.heavenlyStem,
      branch: palace.earthlyBranch,
      isBodyPalace: palace.isBodyPalace,
      majorStars: palace.majorStars.map((star) => [star.name, star.brightness, star.mutagen]),
      minorStars: palace.minorStars.map((star) => [star.name, star.brightness, star.mutagen]),
    })),
  });
}

function periodValue(scope: ZiweiPeriodFact["scope"], item: {
  name: unknown;
  heavenlyStem: unknown;
  earthlyBranch: unknown;
  palaceNames: unknown[];
  index: number;
  mutagen: unknown[];
}): ZiweiPeriodFact {
  return {
    scope,
    label: String(item.name),
    heavenlyStem: String(item.heavenlyStem),
    earthlyBranch: String(item.earthlyBranch),
    palaceName: String(item.palaceNames[item.index] ?? "未标注"),
    transformations: item.mutagen.map(String),
  };
}

export function calculateZiwei(profile: BirthProfileInput, targetDate: string): ZiweiReading {
  if (profile.timeAccuracy === "unknown" || !profile.birthTime) {
    return {
      schemaVersion: ZIWEI_ENGINE.schemaVersion,
      engine: ZIWEI_ENGINE,
      status: "unavailable",
      completeness: "unavailable-unknown-time",
      calculatedFor: targetDate,
      timeIndex: null,
      lunarDate: null,
      chineseDate: null,
      zodiac: null,
      soulPalaceBranch: null,
      bodyPalaceBranch: null,
      soulStar: null,
      bodyStar: null,
      fiveElementsClass: null,
      palaces: [],
      periods: [],
      conventions: { calendarInput: "Gregorian", leapMonthAdjustment: true, language: "zh-CN", directionRule: "not-applied" },
      caveats: ["出生时间未知：紫微命宫、身宫与十二宫不进行推算。"],
    };
  }

  const timeIndex = parseTimeIndex(profile.birthTime);
  const date = normalizeDate(profile.birthDate);
  const hasDirectionInput = profile.traditionalGender === "female" || profile.traditionalGender === "male";
  const selectedGender = profile.traditionalGender === "female" ? "女" : "男";
  const chart = astro.bySolar(date, timeIndex, selectedGender, true, "zh-CN");

  if (!hasDirectionInput) {
    const comparison = astro.bySolar(date, timeIndex, "女", true, "zh-CN");
    if (coreSignature(chart) !== coreSignature(comparison)) {
      throw new Error("Zi Wei natal structure depends on an unavailable traditional direction input");
    }
  }

  const target = normalizeDate(targetDate);
  const horoscope = chart.horoscope(target, 6).toJSON();
  const periods: ZiweiPeriodFact[] = [
    ...(hasDirectionInput ? [periodValue("decadal", horoscope.decadal)] : []),
    periodValue("yearly", horoscope.yearly),
    periodValue("monthly", horoscope.monthly),
    periodValue("daily", horoscope.daily),
  ];

  return {
    schemaVersion: ZIWEI_ENGINE.schemaVersion,
    engine: ZIWEI_ENGINE,
    status: "calculated",
    completeness: hasDirectionInput ? "natal-and-periods" : "natal-with-neutral-periods",
    calculatedFor: targetDate,
    timeIndex,
    lunarDate: chart.lunarDate,
    chineseDate: chart.chineseDate,
    zodiac: chart.zodiac,
    soulPalaceBranch: chart.earthlyBranchOfSoulPalace,
    bodyPalaceBranch: chart.earthlyBranchOfBodyPalace,
    soulStar: chart.soul,
    bodyStar: chart.body,
    fiveElementsClass: chart.fiveElementsClass,
    palaces: chart.palaces.map(palaceValue),
    periods,
    conventions: {
      calendarInput: "Gregorian",
      leapMonthAdjustment: true,
      language: "zh-CN",
      directionRule: hasDirectionInput ? "traditional-gender" : "not-applied",
    },
    caveats: [
      "紫微斗数属于传统解释体系；宫位与星曜是排盘事实，不是科学测量或结果保证。",
      ...(hasDirectionInput ? [] : ["未选择传统男／女规则：本命十二宫照常排盘，但省略依赖顺逆方向的大限。"]),
    ],
  };
}
