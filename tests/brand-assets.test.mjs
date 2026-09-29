import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";

const chartPath = new URL("../public/images/brand/life-map-confluence.webp", import.meta.url);
const markPath = new URL("../public/images/brand/life-map-star-mark.webp", import.meta.url);
const iconPath = new URL("../app/icon.png", import.meta.url);
const productAssets = [
  "amethyst.jpg",
  "black-tourmaline.jpg",
  "five-elements-bracelet.jpg",
  "green-aventurine.jpg",
  "personal-life-map-art.jpg",
  "rose-quartz.jpg",
];

test("the Life Map hero artwork stays production-sized", async () => {
  const asset = await stat(chartPath);
  assert.equal(asset.isFile(), true);
  assert.ok(asset.size > 10_000, "brand artwork should not be an empty placeholder");
  assert.ok(asset.size <= 300_000, "brand artwork should stay below 300 KB");
});

test("the star brand mark stays lightweight", async () => {
  const [mark, icon] = await Promise.all([stat(markPath), stat(iconPath)]);
  assert.equal(mark.isFile(), true);
  assert.equal(icon.isFile(), true);
  assert.ok(mark.size > 10_000, "star mark should not be an empty placeholder");
  assert.ok(mark.size <= 80_000, "star mark should stay below 80 KB");
  assert.ok(icon.size <= 80_000, "browser icon should stay below 80 KB");
});

test("product images stay pre-optimized for the Sites runtime", async () => {
  for (const filename of productAssets) {
    const asset = await stat(new URL(`../public/images/products/${filename}`, import.meta.url));
    assert.equal(asset.isFile(), true, filename);
    assert.ok(asset.size <= 160_000, `${filename} should stay below 160 KB`);
  }
});
