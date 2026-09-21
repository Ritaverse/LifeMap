import assert from "node:assert/strict";
import test from "node:test";
import {
  clearReflections,
  readReflections,
  reflectionStorageKey,
  removeReflection,
  saveReflection,
} from "../app/lib/reflection-storage.ts";

function createSessionStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

const reflection = {
  id: "reflection-test",
  focus: "relationships",
  domain: "relationships",
  question: "我应该怎样说明自己的边界？",
  options: "继续沉默 / 主动沟通",
  concern: "担心冲突",
  deadline: "2026-09-28",
  action: "先写下一个具体请求",
  reviewDate: "2026-10-05",
  createdAt: "2026-09-20T12:00:00.000Z",
};

test("reflections round-trip through session-only storage", () => {
  globalThis.sessionStorage = createSessionStorage();
  assert.deepEqual(readReflections(), []);
  saveReflection(reflection);
  assert.deepEqual(readReflections(), [reflection]);
  assert.equal(sessionStorage.has(reflectionStorageKey()), true);
});

test("reflection records can be removed or cleared", () => {
  globalThis.sessionStorage = createSessionStorage();
  saveReflection(reflection);
  assert.deepEqual(removeReflection(reflection.id), []);
  saveReflection(reflection);
  clearReflections();
  assert.deepEqual(readReflections(), []);
});

test("malformed reflection records are ignored", () => {
  globalThis.sessionStorage = createSessionStorage();
  sessionStorage.setItem(reflectionStorageKey(), JSON.stringify([{ ...reflection, domain: "unknown" }, null]));
  assert.deepEqual(readReflections(), []);
});
