import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFName, PDFString, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import type { LifeMapReport, ReportBlock, ReportContentKind, ReportPage } from "./report";
import { FULL_REPORT_PRODUCT, REPORT_SCHEMA_VERSION } from "./report-product.ts";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 44;
const REPORT_FONT_URL = "/fonts/noto-sans-sc-report.ttf";

const palette = {
  canvas: rgb(0.086, 0.055, 0.184),
  surface: rgb(0.149, 0.098, 0.259),
  surfaceStrong: rgb(0.208, 0.137, 0.329),
  ink: rgb(0.984, 0.973, 1),
  inkSoft: rgb(0.867, 0.831, 0.929),
  inkMuted: rgb(0.702, 0.655, 0.792),
  line: rgb(0.29, 0.216, 0.416),
  sky: rgb(0.557, 0.847, 0.929),
  rose: rgb(0.949, 0.576, 0.835),
  starlight: rgb(0.882, 0.725, 1),
};

const accentByKind: Record<ReportContentKind, ReturnType<typeof rgb>> = {
  "calculated-fact": palette.sky,
  "traditional-reflection": palette.starlight,
  practice: palette.rose,
  methodology: palette.inkMuted,
};

export interface ReportPdfRenderOptions {
  /**
   * Tests and non-browser callers can inject the exact bundled font bytes.
   * Browser callers normally omit this and load the local OFL font asset.
   */
  fontBytes?: Uint8Array;
}

export interface PrivateReportPdfUpload {
  method: "POST";
  headers: Readonly<{
    "content-type": "application/pdf";
    "x-life-map-pdf-sha256": string;
    "x-life-map-pdf-pages": string;
    "x-life-map-report-schema": string;
  }>;
  body: ArrayBuffer;
}

interface TextStyle {
  size: number;
  lineHeight: number;
  maxLines: number;
}

function fixedMetadataDate(generatedOn: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(generatedOn)) {
    throw new Error("Report date must use YYYY-MM-DD");
  }

  const value = new Date(`${generatedOn}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== generatedOn) {
    throw new Error("Report date must be a valid calendar date");
  }
  return value;
}

function validateReport(report: LifeMapReport) {
  if (!report.title.trim() || !report.pages.length) {
    throw new Error("Report must contain a title and at least one page");
  }

  const pageIds = new Set<string>();
  report.pages.forEach((page, index) => {
    if (!page.id.trim() || pageIds.has(page.id)) throw new Error(`Duplicate or empty report page ID: ${page.id}`);
    if (page.number !== index + 1) throw new Error("Report pages must be numbered sequentially from 1");
    pageIds.add(page.id);
  });
}

async function loadBundledFont() {
  if (typeof fetch !== "function") {
    throw new Error("Report font bytes are required outside a browser");
  }

  const response = await fetch(REPORT_FONT_URL, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Unable to load the bundled report font (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

function drawLine(page: PDFPage, x1: number, y1: number, x2: number, y2: number, color = palette.line, opacity = 1) {
  page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.65, color, opacity });
}

function fitText(text: string, font: PDFFont, maxWidth: number, style: TextStyle) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const tokens: string[] = [];
  let word = "";
  const flushWord = () => {
    if (word) tokens.push(word);
    word = "";
  };
  for (const character of Array.from(normalized)) {
    if (/[A-Za-z0-9\u00c0-\u024f]/.test(character) || "°′'’._/+:%(),-–—×".includes(character)) {
      word += character;
    } else {
      flushWord();
      tokens.push(character);
    }
  }
  flushWord();

  const lines: string[] = [];
  let current = "";
  const pushCurrent = () => {
    if (current.trim()) lines.push(current.trimEnd());
    current = "";
  };
  const closingPunctuation = "，。；：！？、）》】』」…";
  for (const token of tokens) {
    const candidate = current + token;
    if (current && font.widthOfTextAtSize(candidate, style.size) > maxWidth) {
      if (closingPunctuation.includes(token[0] ?? "")) {
        current = candidate;
        continue;
      }
      pushCurrent();
      current = token.trimStart();
      if (font.widthOfTextAtSize(current, style.size) > maxWidth) {
        const oversized = Array.from(current);
        current = "";
        oversized.forEach((character) => {
          const fragment = current + character;
          if (current && font.widthOfTextAtSize(fragment, style.size) > maxWidth) pushCurrent();
          current += character;
        });
      }
    } else {
      current = candidate;
    }
  }
  pushCurrent();

  if (lines.length <= style.maxLines) return lines;
  const visible = lines.slice(0, style.maxLines);
  let finalLine = visible.at(-1) ?? "";
  while (finalLine && font.widthOfTextAtSize(`${finalLine}…`, style.size) > maxWidth) {
    finalLine = finalLine.slice(0, -1);
  }
  visible[visible.length - 1] = `${finalLine.trimEnd()}…`;
  return visible;
}

function drawTextLines(
  page: PDFPage,
  lines: string[],
  font: PDFFont,
  x: number,
  y: number,
  style: Omit<TextStyle, "maxLines">,
  color = palette.ink,
  opacity = 1,
) {
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * style.lineHeight, size: style.size, font, color, opacity });
  });
  return y - lines.length * style.lineHeight;
}

function drawPageFrame(page: PDFPage, font: PDFFont, model: ReportPage, pageCount: number) {
  page.drawRectangle({ x: 0, y: 0, width: A4_WIDTH, height: A4_HEIGHT, color: palette.canvas });

  page.drawCircle({
    x: A4_WIDTH + 8,
    y: A4_HEIGHT - 160,
    size: 166,
    color: palette.starlight,
    opacity: 0.035,
    borderColor: palette.starlight,
    borderOpacity: 0.16,
    borderWidth: 0.7,
  });
  page.drawCircle({
    x: A4_WIDTH + 8,
    y: A4_HEIGHT - 160,
    size: 116,
    borderColor: palette.sky,
    borderOpacity: 0.11,
    borderWidth: 0.7,
  });
  drawLine(page, PAGE_MARGIN, 54, A4_WIDTH - PAGE_MARGIN, A4_HEIGHT - 56, palette.sky, 0.07);
  drawLine(page, PAGE_MARGIN, A4_HEIGHT - 58, A4_WIDTH - PAGE_MARGIN, A4_HEIGHT - 58, palette.line);
  drawLine(page, PAGE_MARGIN, 45, A4_WIDTH - PAGE_MARGIN, 45, palette.line);

  page.drawText(model.eyebrow.toUpperCase(), {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - 49,
    size: 6.6,
    font,
    color: palette.starlight,
  });
  const folio = `${String(model.number).padStart(2, "0")} / ${String(pageCount).padStart(2, "0")}`;
  page.drawText(folio, {
    x: A4_WIDTH - PAGE_MARGIN - font.widthOfTextAtSize(folio, 6.6),
    y: A4_HEIGHT - 49,
    size: 6.6,
    font,
    color: palette.inkMuted,
  });
  page.drawText("LIFE MAP · PERSONAL REFLECTION", {
    x: PAGE_MARGIN,
    y: 28,
    size: 6.2,
    font,
    color: palette.inkMuted,
  });
  const footer = `PRIVATE PDF · PAGE ${model.number}`;
  page.drawText(footer, {
    x: A4_WIDTH - PAGE_MARGIN - font.widthOfTextAtSize(footer, 6.2),
    y: 28,
    size: 6.2,
    font,
    color: palette.inkMuted,
  });
}

function drawCard(page: PDFPage, font: PDFFont, block: ReportBlock, x: number, y: number, width: number, height: number) {
  const accent = accentByKind[block.kind];
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: palette.surface,
    opacity: 0.88,
    borderColor: accent,
    borderOpacity: 0.26,
    borderWidth: 0.75,
  });
  page.drawRectangle({ x, y: y + height - 2, width, height: 2, color: accent, opacity: 0.64 });

  const inset = 15;
  const labelStyle = { size: 6.2, lineHeight: 8, maxLines: 1 };
  const titleStyle = { size: height < 112 ? 10.4 : 11.8, lineHeight: height < 112 ? 13.5 : 15, maxLines: 2 };
  const bodyStyle = {
    size: height < 112 ? 7.1 : 7.8,
    lineHeight: height < 112 ? 10.4 : 11.7,
    maxLines: Math.max(2, Math.floor((height - 70) / (height < 112 ? 10.4 : 11.7))),
  };
  let cursor = y + height - 18;
  cursor = drawTextLines(page, fitText(block.label.toUpperCase(), font, width - inset * 2, labelStyle), font, x + inset, cursor, labelStyle, accent);
  cursor -= 7;
  cursor = drawTextLines(page, fitText(block.title, font, width - inset * 2, titleStyle), font, x + inset, cursor, titleStyle, palette.ink);
  cursor -= 5;
  drawTextLines(page, fitText(block.body, font, width - inset * 2, bodyStyle), font, x + inset, cursor, bodyStyle, palette.inkSoft);
}

function drawCover(page: PDFPage, font: PDFFont, model: ReportPage, report: LifeMapReport) {
  const titleStyle = { size: 31, lineHeight: 39, maxLines: 2 };
  const titleLines = fitText(model.title, font, A4_WIDTH - PAGE_MARGIN * 2, titleStyle);
  const cursor = drawTextLines(page, titleLines, font, PAGE_MARGIN, A4_HEIGHT - 130, titleStyle, palette.ink);
  const subtitleStyle = { size: 10.5, lineHeight: 16, maxLines: 3 };
  drawTextLines(page, fitText(model.subtitle, font, A4_WIDTH - PAGE_MARGIN * 2, subtitleStyle), font, PAGE_MARGIN, cursor - 7, subtitleStyle, palette.inkSoft);

  const centerX = A4_WIDTH / 2;
  const centerY = 454;
  [122, 92, 62].forEach((radius, index) => {
    page.drawCircle({
      x: centerX,
      y: centerY,
      size: radius,
      borderColor: index === 1 ? palette.sky : palette.starlight,
      borderOpacity: index === 1 ? 0.3 : 0.42,
      borderWidth: 0.8,
    });
  });
  for (let index = 0; index < 12; index += 1) {
    const angle = (Math.PI * 2 * index) / 12;
    drawLine(
      page,
      centerX + Math.cos(angle) * 92,
      centerY + Math.sin(angle) * 92,
      centerX + Math.cos(angle) * 122,
      centerY + Math.sin(angle) * 122,
      palette.starlight,
      0.32,
    );
  }
  page.drawCircle({ x: centerX, y: centerY + 122, size: 4, color: palette.rose, opacity: 0.9 });
  const mark = "命";
  page.drawText(mark, {
    x: centerX - font.widthOfTextAtSize(mark, 50) / 2,
    y: centerY - 17,
    size: 50,
    font,
    color: palette.ink,
  });
  const owner = `${report.owner} · ${report.generatedOn}`;
  page.drawText(owner, {
    x: centerX - font.widthOfTextAtSize(owner, 9) / 2,
    y: centerY - 50,
    size: 9,
    font,
    color: palette.starlight,
  });

  const cardGap = 12;
  const cardWidth = (A4_WIDTH - PAGE_MARGIN * 2 - cardGap) / 2;
  model.blocks.slice(0, 2).forEach((block, index) => {
    drawCard(page, font, block, PAGE_MARGIN + index * (cardWidth + cardGap), 82, cardWidth, 132);
  });
}

function drawStandardPage(page: PDFPage, font: PDFFont, model: ReportPage) {
  const titleStyle = { size: 26, lineHeight: 33, maxLines: 2 };
  let cursor = drawTextLines(
    page,
    fitText(model.title, font, A4_WIDTH - PAGE_MARGIN * 2, titleStyle),
    font,
    PAGE_MARGIN,
    A4_HEIGHT - 118,
    titleStyle,
    palette.ink,
  );
  const subtitleStyle = { size: 9.2, lineHeight: 14, maxLines: 2 };
  cursor = drawTextLines(
    page,
    fitText(model.subtitle, font, A4_WIDTH - PAGE_MARGIN * 2, subtitleStyle),
    font,
    PAGE_MARGIN,
    cursor - 4,
    subtitleStyle,
    palette.inkSoft,
  );

  const blocks = model.blocks;
  const useTwoColumns = blocks.length >= 4;
  const columns = useTwoColumns ? 2 : 1;
  const rows = Math.ceil(blocks.length / columns);
  const gap = 11;
  const contentTop = Math.min(cursor - 20, 674);
  const contentBottom = 67;
  const availableHeight = contentTop - contentBottom;
  const naturalHeight = (availableHeight - gap * Math.max(0, rows - 1)) / rows;
  const cardHeight = Math.min(218, naturalHeight);
  const cardWidth = (A4_WIDTH - PAGE_MARGIN * 2 - gap * (columns - 1)) / columns;

  blocks.forEach((block, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = PAGE_MARGIN + column * (cardWidth + gap);
    const y = contentTop - cardHeight - row * (cardHeight + gap);
    drawCard(page, font, block, x, y, cardWidth, cardHeight);
  });
}

/**
 * Renders the provided report without mutating it. Import this module with
 * `await import("./report-pdf")` from the client so pdf-lib stays in a separate chunk.
 */
export async function renderLifeMapReportPdf(
  report: LifeMapReport,
  options: ReportPdfRenderOptions = {},
): Promise<Uint8Array<ArrayBuffer>> {
  validateReport(report);
  const metadataDate = fixedMetadataDate(report.generatedOn);
  const fontBytes = options.fontBytes ? Uint8Array.from(options.fontBytes) : await loadBundledFont();
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: true });

  // Keep document metadata useful but deliberately free of the report owner,
  // birth details, location, calculated chart facts, and user questions.
  pdf.setTitle("Life Map Personal Reflection Report");
  pdf.setAuthor("Life Map");
  pdf.setSubject("A private, evidence-grounded multi-system reflection report");
  pdf.setCreator("Life Map deterministic PDF renderer");
  pdf.setProducer("Life Map");
  pdf.setKeywords(["Life Map", "personal reflection", "BaZi", "Zi Wei Dou Shu", "astrology"]);
  pdf.setCreationDate(metadataDate);
  pdf.setModificationDate(metadataDate);
  pdf.catalog.set(PDFName.of("Lang"), PDFString.of("zh-CN"));

  report.pages.forEach((model) => {
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    drawPageFrame(page, font, model, report.pages.length);
    if (model.id === "cover") drawCover(page, font, model, report);
    else drawStandardPage(page, font, model);
  });

  return Uint8Array.from(await pdf.save({ addDefaultPage: false, useObjectStreams: true, updateFieldAppearances: false }));
}

export async function sha256Hex(bytes: Uint8Array) {
  const copy = Uint8Array.from(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy.buffer);
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

/**
 * Builds the private Life Map API request from finished PDF bytes only. No
 * report model fields are serialized into headers, query strings, or JSON.
 */
export async function preparePrivateReportPdfUpload(pdfBytes: Uint8Array): Promise<PrivateReportPdfUpload> {
  if (pdfBytes.length < 5 || new TextDecoder("ascii").decode(pdfBytes.slice(0, 5)) !== "%PDF-") {
    throw new Error("Only a valid PDF document can be uploaded");
  }
  const bodyBytes = Uint8Array.from(pdfBytes);
  return {
    method: "POST",
    headers: {
      "content-type": "application/pdf",
      "x-life-map-pdf-sha256": await sha256Hex(bodyBytes),
      "x-life-map-pdf-pages": String(FULL_REPORT_PRODUCT.pages),
      "x-life-map-report-schema": REPORT_SCHEMA_VERSION,
    },
    body: bodyBytes.buffer,
  };
}
