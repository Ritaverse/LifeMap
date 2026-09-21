import type { DomainId } from "./types";
import type { ReflectionFocus } from "./profile-storage";

const reflectionKey = "life-map-reflections-v1";

export interface SavedReflection {
  id: string;
  focus: ReflectionFocus;
  domain: DomainId;
  question: string;
  options: string;
  concern: string;
  deadline: string;
  action: string;
  reviewDate: string;
  createdAt: string;
}

function parseJson(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}

function isSavedReflection(value: unknown): value is SavedReflection {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedReflection>;
  return (
    typeof item.id === "string" &&
    ["relationships", "career", "timing", "self"].includes(String(item.focus)) &&
    ["identity", "career", "wealth", "love", "family", "relationships", "creativity", "inner-life"].includes(String(item.domain)) &&
    typeof item.question === "string" &&
    typeof item.options === "string" &&
    typeof item.concern === "string" &&
    typeof item.deadline === "string" &&
    typeof item.action === "string" &&
    typeof item.reviewDate === "string" &&
    typeof item.createdAt === "string"
  );
}

export function readReflections(): SavedReflection[] {
  const value = parseJson(sessionStorage.getItem(reflectionKey));
  if (!Array.isArray(value)) return [];
  return value.filter(isSavedReflection).slice(0, 12);
}

export function saveReflection(reflection: SavedReflection) {
  const next = [reflection, ...readReflections().filter((item) => item.id !== reflection.id)].slice(0, 12);
  sessionStorage.setItem(reflectionKey, JSON.stringify(next));
  return next;
}

export function clearReflections() {
  sessionStorage.removeItem(reflectionKey);
}

export function removeReflection(id: string) {
  const next = readReflections().filter((item) => item.id !== id);
  sessionStorage.setItem(reflectionKey, JSON.stringify(next));
  return next;
}

export function reflectionStorageKey() {
  return reflectionKey;
}
