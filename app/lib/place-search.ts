import type { BirthPlace } from "./bazi";

const endpoint = "https://geocoding-api.open-meteo.com/v1/search";

interface OpenMeteoLocation {
  id?: number;
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  country_code?: string;
  country?: string;
  admin1?: string;
}

export interface OpenMeteoSearchPayload {
  results?: OpenMeteoLocation[];
  error?: boolean;
  reason?: string;
}

export function mapPlaceSearchPayload(payload: OpenMeteoSearchPayload): BirthPlace[] {
  if (!Array.isArray(payload.results)) return [];
  return payload.results.flatMap((result) => {
    if (
      typeof result.id !== "number" ||
      typeof result.name !== "string" || !result.name.trim() ||
      typeof result.country !== "string" || !result.country.trim() ||
      typeof result.country_code !== "string" || !/^[A-Za-z]{2}$/.test(result.country_code) ||
      typeof result.latitude !== "number" || !Number.isFinite(result.latitude) || Math.abs(result.latitude) > 90 ||
      typeof result.longitude !== "number" || !Number.isFinite(result.longitude) || Math.abs(result.longitude) > 180 ||
      typeof result.timezone !== "string" || !result.timezone.trim()
    ) return [];
    const admin1 = result.admin1?.trim();
    const label = [result.name.trim(), admin1 && admin1 !== result.name.trim() ? admin1 : null, result.country.trim()].filter(Boolean).join(", ");
    return [{
      id: `open-meteo:${result.id}`,
      label,
      city: result.name.trim(),
      ...(admin1 ? { admin1 } : {}),
      country: result.country.trim(),
      countryCode: result.country_code.toUpperCase(),
      latitude: result.latitude,
      longitude: result.longitude,
      timeZone: result.timezone.trim(),
      source: "open-meteo" as const,
    }];
  });
}

export async function searchBirthPlaces(query: string, options: { signal?: AbortSignal; language?: string } = {}) {
  const normalized = query.trim();
  if (normalized.length < 2) throw new Error("Location query must contain at least two characters");
  const url = new URL(endpoint);
  url.searchParams.set("name", normalized);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", (options.language ?? "zh").toLowerCase().slice(0, 2));
  url.searchParams.set("format", "json");
  const response = await fetch(url, { signal: options.signal, credentials: "omit", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Location search failed with ${response.status}`);
  const payload = await response.json() as OpenMeteoSearchPayload;
  if (payload.error) throw new Error(payload.reason || "Location search failed");
  return mapPlaceSearchPayload(payload);
}
