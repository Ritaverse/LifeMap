import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

const chartPath = new URL("../public/images/brand/life-map-confluence.webp", import.meta.url);

test("the Life Map hero artwork stays production-sized", async () => {
  const asset = await stat(chartPath);
  assert.equal(asset.isFile(), true);
  assert.ok(asset.size > 10_000, "brand artwork should not be an empty placeholder");
  assert.ok(asset.size <= 300_000, "brand artwork should stay below 300 KB");
});
