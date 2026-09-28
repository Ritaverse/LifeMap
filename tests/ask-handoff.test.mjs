import assert from "node:assert/strict";
import test from "node:test";
import {
  askHandoffStorageKey,
  clearAskHandoff,
  consumeAskHandoff,
  writeAskHandoff,
} from "../app/lib/ask-handoff.ts";

function createSessionStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

test("Ask handoffs remain in session storage and are consumed once", () => {
  globalThis.sessionStorage = createSessionStorage();
  assert.equal(writeAskHandoff({ prompt: "  我该如何说明边界？  ", focus: "relationships" }), true);
  assert.equal(sessionStorage.has(askHandoffStorageKey()), true);
  const handoff = consumeAskHandoff();
  assert.equal(handoff?.prompt, "我该如何说明边界？");
  assert.equal(handoff?.focus, "relationships");
  assert.equal(typeof handoff?.createdAt, "string");
  assert.equal(consumeAskHandoff(), null);
});

test("Ask handoffs reject empty input and discard malformed storage", () => {
  globalThis.sessionStorage = createSessionStorage();
  assert.equal(writeAskHandoff({ prompt: "" }), false);
  sessionStorage.setItem(askHandoffStorageKey(), JSON.stringify({ prompt: 42, focus: "unknown" }));
  assert.equal(consumeAskHandoff(), null);
  assert.equal(sessionStorage.has(askHandoffStorageKey()), false);
});

test("Ask handoffs can carry a focus without putting it in the URL", () => {
  globalThis.sessionStorage = createSessionStorage();
  assert.equal(writeAskHandoff({ focus: "career" }), true);
  assert.equal(consumeAskHandoff()?.focus, "career");
  writeAskHandoff({ prompt: "test" });
  clearAskHandoff();
  assert.equal(consumeAskHandoff(), null);
});
