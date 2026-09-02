import { Solar } from "lunar-typescript";

export const BAZI_ENGINE = {
  id: "lunar-typescript",
  version: "1.8.6",
  schemaVersion: "life-map.bazi.v1",
} as const;

export type TraditionalGender = "female" | "male" | "nonbinary" | "prefer-not-to-say";
export type PillarKind = "year" | "month" | "day" | "time";
export type FiveElement = "木" | "火" | "土" | "金" | "水";

export interface BirthPlace {
  id: string;
  label: string;
  city: string;
  admin1?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: "open-meteo" | "sample-default";
}

export interface BirthProfileInput {
  displayName: string;
  birthDate: string;
  birthTime: string | null;
  timeAccuracy: "known" | "unknown";
  birthPlace: BirthPlace;
  traditionalGender: TraditionalGender;
}

export interface BaziPillar {
  kind: PillarKind;
  label: string;
  ganZhi: string;
  stem: string;
  branch: string;
  elements: [FiveElement, FiveElement];
  stemTenGod: string;
  hiddenStems: string[];
  hiddenTenGods: string[];
  naYin: string;
}

export interface BaziReading {
  schemaVersion: typeof BAZI_ENGINE.schemaVersion;
  engine: typeof BAZI_ENGINE;
  profile: BirthProfileInput;
  place: BirthPlace;
  lunarDate: string;
  completeness: "four-pillars" | "three-pillars-provisional";
  pillars: {
    year: BaziPillar;
    month: BaziPillar;
    day: BaziPillar;
    time: BaziPillar | null;
  };
  dayMaster: {
    stem: string;
    element: FiveElement;
    polarity: "阳" | "阴";
  };
  visibleElementCounts: Record<FiveElement, number>;
  conventions: {
    inputCalendar: "Gregorian";
    yearBoundary: "Li Chun";
    monthBoundary: "Solar terms (Jie)";
    dayBoundary: "00:00 local civil time";
    timeBasis: "Local civil time at birthplace";
    trueSolarTime: false;
  };
  caveats: string[];
}

export const defaultBirthPlace: BirthPlace = {
  id: "sample:shanghai",
  label: "Shanghai, China",
  city: "Shanghai",
  country: "China",
  countryCode: "CN",
  latitude: 31.2304,
  longitude: 121.4737,
  timeZone: "Asia/Shanghai",
  source: "sample-default",
};

export const demoBirthProfile: BirthProfileInput = {
  displayName: "Yu",
  birthDate: "1990-06-17",
  birthTime: "09:32",
  timeAccuracy: "known",
  birthPlace: defaultBirthPlace,
  traditionalGender: "prefer-not-to-say",
};

const stemElements: Record<string, FiveElement> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

const elementNames = new Set<FiveElement>(["木", "火", "土", "金", "水"]);

export function isBirthPlace(value: unknown): value is BirthPlace {
  if (!value || typeof value !== "object") return false;
  const place = value as Partial<BirthPlace>;
  return (
    typeof place.id === "string" && place.id.length > 0 &&
    typeof place.label === "string" && place.label.length > 0 &&
    typeof place.city === "string" && place.city.length > 0 &&
    typeof place.country === "string" && place.country.length > 0 &&
    typeof place.countryCode === "string" && /^[A-Z]{2}$/.test(place.countryCode) &&
    typeof place.latitude === "number" && Number.isFinite(place.latitude) && Math.abs(place.latitude) <= 90 &&
    typeof place.longitude === "number" && Number.isFinite(place.longitude) && Math.abs(place.longitude) <= 180 &&
    typeof place.timeZone === "string" && isTimeZone(place.timeZone) &&
    (place.source === "open-meteo" || place.source === "sample-default")
  );
}

function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

function parseBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Birth date must use YYYY-MM-DD");
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const normalized = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 || year > 2100 ||
    normalized.getUTCFullYear() !== year ||
    normalized.getUTCMonth() !== month - 1 ||
    normalized.getUTCDate() !== day
  ) throw new Error("Birth date is outside the supported range");
  return { year, month, day };
}

function parseBirthTime(value: string | null, accuracy: BirthProfileInput["timeAccuracy"]) {
  if (accuracy === "unknown") return { hour: 12, minute: 0 };
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) throw new Error("Birth time must use HH:MM");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Birth time is invalid");
  return { hour, minute };
}

function toElements(value: string): [FiveElement, FiveElement] {
  const elements = [...value].filter((item): item is FiveElement => elementNames.has(item as FiveElement));
  if (elements.length !== 2) throw new Error("Engine returned an invalid element pair");
  return [elements[0], elements[1]];
}

type EightCharLike = ReturnType<ReturnType<typeof Solar.fromYmdHms>["getLunar"]>["getEightChar"] extends () => infer T ? T : never;

function createPillar(kind: PillarKind, eightChar: EightCharLike): BaziPillar {
  const labels: Record<PillarKind, string> = { year: "年柱", month: "月柱", day: "日柱", time: "时柱" };
  const getters = {
    year: {
      ganZhi: () => eightChar.getYear(), stem: () => eightChar.getYearGan(), branch: () => eightChar.getYearZhi(),
      elements: () => eightChar.getYearWuXing(), tenGod: () => eightChar.getYearShiShenGan(), hidden: () => eightChar.getYearHideGan(),
      hiddenGods: () => eightChar.getYearShiShenZhi(), naYin: () => eightChar.getYearNaYin(),
    },
    month: {
      ganZhi: () => eightChar.getMonth(), stem: () => eightChar.getMonthGan(), branch: () => eightChar.getMonthZhi(),
      elements: () => eightChar.getMonthWuXing(), tenGod: () => eightChar.getMonthShiShenGan(), hidden: () => eightChar.getMonthHideGan(),
      hiddenGods: () => eightChar.getMonthShiShenZhi(), naYin: () => eightChar.getMonthNaYin(),
    },
    day: {
      ganZhi: () => eightChar.getDay(), stem: () => eightChar.getDayGan(), branch: () => eightChar.getDayZhi(),
      elements: () => eightChar.getDayWuXing(), tenGod: () => eightChar.getDayShiShenGan(), hidden: () => eightChar.getDayHideGan(),
      hiddenGods: () => eightChar.getDayShiShenZhi(), naYin: () => eightChar.getDayNaYin(),
    },
    time: {
      ganZhi: () => eightChar.getTime(), stem: () => eightChar.getTimeGan(), branch: () => eightChar.getTimeZhi(),
      elements: () => eightChar.getTimeWuXing(), tenGod: () => eightChar.getTimeShiShenGan(), hidden: () => eightChar.getTimeHideGan(),
      hiddenGods: () => eightChar.getTimeShiShenZhi(), naYin: () => eightChar.getTimeNaYin(),
    },
  }[kind];
  return {
    kind,
    label: labels[kind],
    ganZhi: getters.ganZhi(),
    stem: getters.stem(),
    branch: getters.branch(),
    elements: toElements(getters.elements()),
    stemTenGod: getters.tenGod(),
    hiddenStems: getters.hidden(),
    hiddenTenGods: getters.hiddenGods(),
    naYin: getters.naYin(),
  };
}

export function calculateBazi(profile: BirthProfileInput): BaziReading {
  if (!profile.displayName.trim()) throw new Error("Display name is required");
  const { year, month, day } = parseBirthDate(profile.birthDate);
  const { hour, minute } = parseBirthTime(profile.birthTime, profile.timeAccuracy);
  if (!isBirthPlace(profile.birthPlace)) throw new Error("Birthplace selection is invalid");
  const place = profile.birthPlace;
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(2);

  const yearPillar = createPillar("year", eightChar);
  const monthPillar = createPillar("month", eightChar);
  const dayPillar = createPillar("day", eightChar);
  const timePillar = profile.timeAccuracy === "known" ? createPillar("time", eightChar) : null;
  const visibleElementCounts: Record<FiveElement, number> = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  [yearPillar, monthPillar, dayPillar, timePillar].filter((pillar): pillar is BaziPillar => Boolean(pillar)).forEach((pillar) => {
    pillar.elements.forEach((element) => { visibleElementCounts[element] += 1; });
  });
  const dayMasterElement = stemElements[dayPillar.stem];
  if (!dayMasterElement) throw new Error("Engine returned an unknown day stem");

  return {
    schemaVersion: BAZI_ENGINE.schemaVersion,
    engine: BAZI_ENGINE,
    profile: { ...profile, displayName: profile.displayName.trim() },
    place,
    lunarDate: lunar.toString(),
    completeness: timePillar ? "four-pillars" : "three-pillars-provisional",
    pillars: { year: yearPillar, month: monthPillar, day: dayPillar, time: timePillar },
    dayMaster: {
      stem: dayPillar.stem,
      element: dayMasterElement,
      polarity: "甲丙戊庚壬".includes(dayPillar.stem) ? "阳" : "阴",
    },
    visibleElementCounts,
    conventions: {
      inputCalendar: "Gregorian",
      yearBoundary: "Li Chun",
      monthBoundary: "Solar terms (Jie)",
      dayBoundary: "00:00 local civil time",
      timeBasis: "Local civil time at birthplace",
      trueSolarTime: false,
    },
    caveats: [
      "四柱按出生地当地民用时间计算，尚未应用真太阳时校正。",
      "五行数量仅统计八个表层干支，不代表旺衰、喜用神或吉凶评分。",
      ...(timePillar ? [] : ["出生时间未知：时柱不显示，节气交接日的年柱或月柱也可能存在边界差异。"]),
    ],
  };
}

export const demoBaziReading = calculateBazi(demoBirthProfile);
