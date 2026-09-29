import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { demoBaziReading } from "../app/lib/bazi.ts";
import { buildCalculatedExperience } from "../app/lib/experience.ts";
import { renderLifeMapReportPdf } from "../app/lib/report-pdf.ts";
import { buildLifeMapReport } from "../app/lib/report.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(process.argv[2] ?? `${root}/output/pdf/life-map-runtime-renderer-sample.pdf`);
const font = new Uint8Array(await readFile(`${root}/public/fonts/noto-sans-sc-report.ttf`));
const experience = buildCalculatedExperience(demoBaziReading, "2026-09-19");
const report = buildLifeMapReport(experience, "2026-09-19");
const pdf = await renderLifeMapReportPdf(report, { fontBytes: font });

await mkdir(dirname(output), { recursive: true });
await writeFile(output, pdf);
process.stdout.write(`Created ${output}\n`);
