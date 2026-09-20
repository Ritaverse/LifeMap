import { AspectType, CelestialBody, calculateChart, calculateTransits } from "celestine";
import type { NatalPoint } from "celestine";
import type { BirthProfileInput } from "./bazi.ts";

export const WESTERN_ENGINE = {
  id: "celestine",
  version: "0.2.1",
  schemaVersion: "life-map.western.v1",
} as const;

export interface WesternPlacement {
  id: string;
  body: string;
  longitude: number;
  sign: string;
  degree: number;
  minute: number;
  house: number | null;
  retrograde: boolean;
}

export interface WesternAspect {
  id: string;
  bodyA: string;
  bodyB: string;
  type: "conjunction" | "sextile" | "square" | "trine" | "opposition";
  orb: number;
  applying: boolean;
}

export interface WesternTransit {
  id: string;
  transitingBody: string;
  natalPoint: string;
  type: WesternAspect["type"];
  orb: number;
  phase: "applying" | "exact" | "separating";
  retrograde: boolean;
  strength: number;
}

export interface WesternReading {
  schemaVersion: typeof WESTERN_ENGINE.schemaVersion;
  engine: typeof WESTERN_ENGINE;
  status: "calculated";
  completeness: "timed-chart" | "date-only-planets";
  utcIso: string;
  utcOffsetHours: number;
  placements: WesternPlacement[];
  aspects: WesternAspect[];
  angles: {
    ascendant: WesternPlacement | null;
    midheaven: WesternPlacement | null;
  };
  houses: Array<{ number: number; longitude: number; sign: string }>;
  conventions: {
    zodiac: "tropical";
    houseSystem: "whole-sign";
    ephemeris: "celestine-local";
    timezoneBasis: "IANA historical offset";
  };
  caveats: string[];
}

export interface WesternTimingReading {
  calculatedFor: string;
  transits: WesternTransit[];
  currentPlacements: WesternPlacement[];
  caveats: string[];
}

interface CivilDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const majorBodies = new Set(["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"]);
const majorAspects = new Set<WesternAspect["type"]>(["conjunction", "sextile", "square", "trine", "opposition"]);
const transitBodies = [CelestialBody.Mars, CelestialBody.Jupiter, CelestialBody.Saturn, CelestialBody.Uranus, CelestialBody.Neptune, CelestialBody.Pluto];

function parseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Western chart date must use YYYY-MM-DD");
  const result = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const date = new Date(Date.UTC(result.year, result.month - 1, result.day));
  if (date.getUTCFullYear() !== result.year || date.getUTCMonth() !== result.month - 1 || date.getUTCDate() !== result.day) {
    throw new Error("Western chart date is invalid");
  }
  return result;
}

function parseTime(value: string | null, known: boolean) {
  if (!known) return { hour: 12, minute: 0, second: 0 };
  const match = /^(\d{2}):(\d{2})$/.exec(value ?? "");
  if (!match) throw new Error("Western chart time must use HH:MM");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Western chart time is invalid");
  return { hour, minute, second: 0 };
}

function zonedParts(instant: Date, timeZone: string): CivilDateTime {
  const parts = new Intl.DateTimeFormat("en-CA-u-hc-h23", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const map = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return {
    year: Number(map.year), month: Number(map.month), day: Number(map.day),
    hour: Number(map.hour), minute: Number(map.minute), second: Number(map.second),
  };
}

function sameCivil(left: CivilDateTime, right: CivilDateTime) {
  return left.year === right.year && left.month === right.month && left.day === right.day &&
    left.hour === right.hour && left.minute === right.minute && left.second === right.second;
}

export function resolveZonedCivilTime(civil: CivilDateTime, timeZone: string) {
  const localStamp = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute, civil.second);
  const sampleOffsets = new Set<number>();
  for (const delta of [-36, -24, -12, 0, 12, 24, 36]) {
    const instant = new Date(localStamp + delta * 3_600_000);
    const shown = zonedParts(instant, timeZone);
    sampleOffsets.add(Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute, shown.second) - instant.getTime());
  }
  const candidates = [...sampleOffsets]
    .map((offsetMs) => new Date(localStamp - offsetMs))
    .filter((instant) => sameCivil(zonedParts(instant, timeZone), civil))
    .sort((a, b) => a.getTime() - b.getTime());
  if (!candidates.length) throw new Error("The selected local time does not exist in the birthplace timezone because of a clock change");
  const instant = candidates[0];
  return {
    instant,
    offsetHours: (localStamp - instant.getTime()) / 3_600_000,
    ambiguous: candidates.length > 1,
  };
}

function placementValue(planet: {
  name: string;
  longitude: number;
  signName: string;
  degree: number;
  minute: number;
  house: number;
  isRetrograde: boolean;
}, houseKnown: boolean): WesternPlacement {
  return {
    id: `western-${planet.name.toLowerCase().replaceAll(" ", "-")}`,
    body: planet.name,
    longitude: planet.longitude,
    sign: planet.signName,
    degree: planet.degree,
    minute: planet.minute,
    house: houseKnown ? planet.house : null,
    retrograde: planet.isRetrograde,
  };
}

function angleValue(name: string, angle: { longitude: number; signName: string; degree: number; minute: number }): WesternPlacement {
  return {
    id: `western-${name.toLowerCase()}`,
    body: name,
    longitude: angle.longitude,
    sign: angle.signName,
    degree: angle.degree,
    minute: angle.minute,
    house: name === "Ascendant" ? 1 : 10,
    retrograde: false,
  };
}

function chartInput(profile: BirthProfileInput, dateValue = profile.birthDate, timeValue = profile.birthTime, known = profile.timeAccuracy === "known") {
  const date = parseDate(dateValue);
  const time = parseTime(timeValue, known);
  const resolved = resolveZonedCivilTime({ ...date, ...time }, profile.birthPlace.timeZone);
  return {
    resolved,
    input: {
      ...date,
      ...time,
      timezone: resolved.offsetHours,
      latitude: profile.birthPlace.latitude,
      longitude: profile.birthPlace.longitude,
    },
  };
}

const chartOptions = {
  houseSystem: "whole-sign" as const,
  includeAsteroids: false,
  includeChiron: false,
  includeLilith: false as const,
  includeNodes: false as const,
  includeLots: false,
  includePatterns: false,
  aspectTypes: [AspectType.Conjunction, AspectType.Sextile, AspectType.Square, AspectType.Trine, AspectType.Opposition],
};

export function calculateWestern(profile: BirthProfileInput): WesternReading {
  const known = profile.timeAccuracy === "known";
  const { input, resolved } = chartInput(profile);
  const chart = calculateChart(input, chartOptions);
  const placements = chart.planets.filter((planet) => majorBodies.has(planet.name)).map((planet) => placementValue(planet, known));
  const aspects = chart.aspects.all
    .filter((aspect) => majorAspects.has(aspect.type as WesternAspect["type"]))
    .map((aspect) => ({
      id: `western-aspect-${aspect.body1}-${aspect.type}-${aspect.body2}`.toLowerCase(),
      bodyA: aspect.body1,
      bodyB: aspect.body2,
      type: aspect.type as WesternAspect["type"],
      orb: Number(aspect.deviation.toFixed(2)),
      applying: Boolean(aspect.isApplying),
    }))
    .sort((left, right) => left.orb - right.orb);

  return {
    schemaVersion: WESTERN_ENGINE.schemaVersion,
    engine: WESTERN_ENGINE,
    status: "calculated",
    completeness: known ? "timed-chart" : "date-only-planets",
    utcIso: resolved.instant.toISOString(),
    utcOffsetHours: resolved.offsetHours,
    placements,
    aspects,
    angles: {
      ascendant: known ? angleValue("Ascendant", chart.angles.ascendant) : null,
      midheaven: known ? angleValue("Midheaven", chart.angles.midheaven) : null,
    },
    houses: known ? chart.houses.cusps.map((cusp) => ({ number: cusp.house, longitude: cusp.longitude, sign: cusp.signName })) : [],
    conventions: { zodiac: "tropical", houseSystem: "whole-sign", ephemeris: "celestine-local", timezoneBasis: "IANA historical offset" },
    caveats: [
      "西方占星位置属于天文计算结果；符号解释属于传统反思语言，不是科学的人格或结果判断。",
      ...(known ? [] : ["出生时间未知：只显示当日行星星座；上升点、天顶与宫位不推算。"]),
      ...(resolved.ambiguous ? ["出生时间处在夏令时回拨的重复时段；本版采用较早出现的时刻。"] : []),
    ],
  };
}

export function calculateWesternTiming(profile: BirthProfileInput, natal: WesternReading, targetDate: string): WesternTimingReading {
  const { input } = chartInput(profile, targetDate, "12:00", true);
  const currentChart = calculateChart(input, chartOptions);
  const natalPoints: NatalPoint[] = natal.placements
    .filter((placement) => ["Sun", "Moon", "Mercury", "Venus", "Mars"].includes(placement.body))
    .map((placement) => ({ name: placement.body, longitude: placement.longitude, type: "planet" as const, house: placement.house ?? undefined }));
  if (natal.angles.ascendant) natalPoints.push({ name: "ASC", longitude: natal.angles.ascendant.longitude, type: "angle", house: 1 });
  if (natal.angles.midheaven) natalPoints.push({ name: "MC", longitude: natal.angles.midheaven.longitude, type: "angle", house: 10 });
  const result = calculateTransits(natalPoints, currentChart.calculated.julianDate, {
    transitingBodies: transitBodies,
    aspectTypes: chartOptions.aspectTypes,
    orbs: {
      [AspectType.Conjunction]: 2.5,
      [AspectType.Sextile]: 2,
      [AspectType.Square]: 2.5,
      [AspectType.Trine]: 2.5,
      [AspectType.Opposition]: 2.5,
    },
    minimumStrength: 15,
    includeOutOfSign: true,
    calculateExactTimes: false,
  });
  return {
    calculatedFor: targetDate,
    transits: result.transits.map((transit) => ({
      id: `transit-${transit.transitingBody}-${transit.aspectType}-${transit.natalPoint}`.toLowerCase(),
      transitingBody: transit.transitingBody,
      natalPoint: transit.natalPoint,
      type: transit.aspectType as WesternAspect["type"],
      orb: Number(transit.deviation.toFixed(2)),
      phase: transit.phase,
      retrograde: transit.isRetrograde,
      strength: transit.strength,
    })).sort((left, right) => right.strength - left.strength),
    currentPlacements: currentChart.planets.filter((planet) => majorBodies.has(planet.name)).map((planet) => placementValue(planet, false)),
    caveats: ["行运显示目标日中午的行星与本命点角距；它描述传统关注主题，不预测事件必然发生。"],
  };
}
