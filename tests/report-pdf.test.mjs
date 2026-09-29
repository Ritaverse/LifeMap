import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PDFDocument } from "pdf-lib";

import { demoBaziReading } from "../app/lib/bazi.ts";
import { buildCalculatedExperience } from "../app/lib/experience.ts";
import { preparePrivateReportPdfUpload, renderLifeMapReportPdf, sha256Hex } from "../app/lib/report-pdf.ts";
import { buildLifeMapReport } from "../app/lib/report.ts";

const fontUrl = new URL("../public/fonts/noto-sans-sc-report.ttf", import.meta.url);

async function renderFixture() {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-19");
  const report = buildLifeMapReport(experience, "2026-09-19");
  const snapshot = structuredClone(report);
  const fontBytes = new Uint8Array(await readFile(fontUrl));
  const pdfBytes = await renderLifeMapReportPdf(report, { fontBytes });
  return { experience, report, snapshot, pdfBytes, fontBytes };
}

test("renderer creates a deterministic ten-page PDF without mutating the report", async () => {
  const { report, snapshot, pdfBytes, fontBytes } = await renderFixture();
  const second = await renderLifeMapReportPdf(report, { fontBytes });
  const pdf = await PDFDocument.load(pdfBytes);

  assert.equal(new TextDecoder("ascii").decode(pdfBytes.slice(0, 5)), "%PDF-");
  assert.equal(pdf.getPageCount(), 10);
  assert.deepEqual(report, snapshot);
  assert.equal(await sha256Hex(pdfBytes), await sha256Hex(second));
  assert.deepEqual(pdf.getPageIndices(), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("browser entry point loads the local report font only when rendering", async () => {
  const experience = buildCalculatedExperience(demoBaziReading, "2026-09-19");
  const report = buildLifeMapReport(experience, "2026-09-19");
  const fontBytes = await readFile(fontUrl);
  const originalFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (input) => {
    requested.push(String(input));
    return new Response(fontBytes, { status: 200 });
  };

  try {
    const pdf = await renderLifeMapReportPdf(report);
    assert.equal((await PDFDocument.load(pdf)).getPageCount(), 10);
    assert.deepEqual(requested, ["/fonts/noto-sans-sc-report.ttf"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("renderer writes stable, privacy-safe document metadata", async () => {
  const { experience, report, pdfBytes } = await renderFixture();
  const pdf = await PDFDocument.load(pdfBytes, { updateMetadata: false });

  assert.equal(pdf.getTitle(), "Life Map Personal Reflection Report");
  assert.equal(pdf.getAuthor(), "Life Map");
  assert.equal(pdf.getSubject(), "A private, evidence-grounded multi-system reflection report");
  assert.equal(pdf.getCreator(), "Life Map deterministic PDF renderer");
  assert.equal(pdf.getProducer(), "Life Map");
  assert.equal(pdf.getCreationDate()?.toISOString(), "2026-09-19T00:00:00.000Z");
  assert.equal(pdf.getModificationDate()?.toISOString(), "2026-09-19T00:00:00.000Z");

  const metadata = [pdf.getTitle(), pdf.getAuthor(), pdf.getSubject(), pdf.getCreator(), pdf.getProducer()].join(" ");
  const sensitiveValues = [
    report.owner,
    experience.bazi.profile.birthDate,
    experience.bazi.profile.birthTime,
    experience.bazi.place.label,
    experience.bazi.place.timeZone,
  ].filter(Boolean);
  sensitiveValues.forEach((value) => assert.doesNotMatch(metadata, new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
});

test("private upload contains only finished PDF bytes and a content digest", async () => {
  const { experience, report, pdfBytes } = await renderFixture();
  const upload = await preparePrivateReportPdfUpload(pdfBytes);

  assert.deepEqual(Object.keys(upload).sort(), ["body", "headers", "method"]);
  assert.equal(upload.method, "POST");
  assert.deepEqual(Object.keys(upload.headers).sort(), [
    "content-type",
    "x-life-map-pdf-pages",
    "x-life-map-pdf-sha256",
    "x-life-map-report-schema",
  ]);
  assert.equal(upload.headers["content-type"], "application/pdf");
  assert.equal(upload.headers["x-life-map-pdf-sha256"], await sha256Hex(pdfBytes));
  assert.equal(upload.headers["x-life-map-pdf-pages"], "10");
  assert.equal(upload.headers["x-life-map-report-schema"], "life-map.full-report.v1");
  assert.deepEqual(new Uint8Array(upload.body), pdfBytes);
  assert.notStrictEqual(upload.body, pdfBytes.buffer);

  const requestMetadata = JSON.stringify({ method: upload.method, headers: upload.headers });
  const forbiddenValues = [
    report.owner,
    experience.bazi.profile.birthDate,
    experience.bazi.profile.birthTime,
    experience.bazi.place.label,
    experience.bazi.place.timeZone,
  ].filter(Boolean);
  forbiddenValues.forEach((value) => assert.equal(requestMetadata.includes(String(value)), false));
  await assert.rejects(() => preparePrivateReportPdfUpload(new TextEncoder().encode("not a PDF")), /valid PDF/);
});
