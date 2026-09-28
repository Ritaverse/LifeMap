import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import test from "node:test";

const assetsDirectory = new URL("../dist/client/assets/", import.meta.url);

test("calculation engines are split out of the initial Life Map client chunk", async () => {
  const files = await readdir(assetsDirectory);
  const appChunk = files.find((file) => /^LifeMapApp-.*\.js$/.test(file));
  const baziChunk = files.find((file) => /^bazi-.*\.js$/.test(file));
  const experienceChunk = files.find((file) => /^experience-.*\.js$/.test(file));

  assert.ok(appChunk, "LifeMapApp chunk should exist");
  assert.ok(baziChunk, "BaZi should be loaded as a separate calculation chunk");
  assert.ok(experienceChunk, "multi-system experience should be a separate calculation chunk");

  const appSize = (await stat(new URL(appChunk, assetsDirectory))).size;
  assert.ok(appSize < 250 * 1024, `initial LifeMapApp chunk should stay below 250 KiB, received ${appSize}`);
});
