import type { ReflectionFocus } from "./profile-storage";

const handoffKey = "life-map-ask-handoff-v1";
const maxPromptLength = 1_200;

export interface AskHandoff {
  prompt?: string;
  focus?: ReflectionFocus;
  createdAt: string;
}

function isReflectionFocus(value: unknown): value is ReflectionFocus {
  return ["relationships", "career", "timing", "self"].includes(String(value));
}

function getSessionStorage(): Storage | null {
  return typeof sessionStorage === "undefined" ? null : sessionStorage;
}

function parseHandoff(value: string | null): AskHandoff | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<AskHandoff>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.createdAt !== "string") return null;
    const prompt = typeof parsed.prompt === "string" ? parsed.prompt.trim().slice(0, maxPromptLength) : "";
    const focus = isReflectionFocus(parsed.focus) ? parsed.focus : undefined;
    if (!prompt && !focus) return null;
    return { ...(prompt ? { prompt } : {}), ...(focus ? { focus } : {}), createdAt: parsed.createdAt };
  } catch {
    return null;
  }
}

export function writeAskHandoff(input: { prompt?: string; focus?: ReflectionFocus }) {
  const storage = getSessionStorage();
  if (!storage) return false;
  const prompt = input.prompt?.trim().slice(0, maxPromptLength);
  const focus = isReflectionFocus(input.focus) ? input.focus : undefined;
  if (!prompt && !focus) return false;
  const handoff: AskHandoff = {
    ...(prompt ? { prompt } : {}),
    ...(focus ? { focus } : {}),
    createdAt: new Date().toISOString(),
  };
  storage.setItem(handoffKey, JSON.stringify(handoff));
  return true;
}

export function consumeAskHandoff(): AskHandoff | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  const value = parseHandoff(storage.getItem(handoffKey));
  storage.removeItem(handoffKey);
  return value;
}

export function clearAskHandoff() {
  getSessionStorage()?.removeItem(handoffKey);
}

export function askHandoffStorageKey() {
  return handoffKey;
}
