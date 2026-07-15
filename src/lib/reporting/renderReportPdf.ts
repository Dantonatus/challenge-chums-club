// Universal, deterministic ReportModel → jsPDF renderer.
// - Real PDF text for titles, KPIs, summaries, tables, footers (small file size, selectable).
// - Charts are drawn to an offscreen canvas at 2x DPI and embedded as PNG.
// - Never renders the live UI.
// - Fails loudly: throws when no chart could be produced despite the model
//   claiming to contain one, and per-section errors are reported (never swallowed).

import jsPDF from 'jspdf';
import type {
  ReportModel,
  RenderOptions,
  RenderResult,
  KpiItem,
  ReportSection,
  ChartSpec,
} from './types';
import { renderChart } from './canvasCharts';
import {
  REPORT_COLORS,
  fmtDateTimeDe,
  hexToRgb,
  sanitizePdfText,
} from './reportFormatting';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 14;
const MARGIN_TOP = 16;
const MARGIN_BOTTOM = 16;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;
const CONTENT_TOP = MARGIN_TOP;
const CONTENT_BOTTOM = PAGE_H - MARGIN_BOTTOM;
const HEADER_H = 8;
const FOOTER_H = 8;

export class ReportRenderError extends Error {
  constructor(message: string, public section?: string) { super(message); this.name = 'ReportRenderError'; }
}

/** Wait for browser fonts and paint before capturing charts. */
export async function waitForRenderReady(): Promise<void> {
  if (typeof document === 'undefined') return;
  try { await (document as unknown as { fonts: { ready: Promise<unknown> } }).fonts.ready; } catch { /* ignore */ }
  await new Promise(r => requestAnimationFrame(() => r(null)));
  await new Promise(r => requestAnimationFrame(() => r(null)));
}

interface PageCursor {
  doc: jsPDF;
  y: number;
  pageNumber: number;
}

function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}
function setDraw(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}
function setText(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

function text(doc: jsPDF, s: string, x: number, y: number, opts?: Parameters<jsPDF['text']>[3]) {
  doc.text(sanitizePdfText(s), x, y, opts);
}

function newPage(cur: PageCursor, model: ReportModel) {
  cur.doc.addPage();
  cur.pageNumber += 1;
  cur.y = CONTENT_TOP;
  drawPageChrome(cur.doc, model, cur.pageNumber);
  cur.y = CONTENT_TOP + HEADER_H + 4;
}

function ensureSpace(cur: PageCursor, model: ReportModel, needed: number) {
  if (cur.y + needed > CONTENT_BOTTOM - FOOTER_H) newPage(cur, model);
}

function drawPageChrome(doc: jsPDF, model: ReportModel, pageNumber: number) {
  // Header
  setDraw(doc, REPORT_COLORS.hairline);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_X, MARGIN_TOP + HEADER_H, PAGE_W - MARGIN_X, MARGIN_TOP + HEADER_H);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  setText(doc, REPORT_COLORS.inkSubtle);
  text(doc, model.title, MARGIN_X, MARGIN_TOP + 4);
  text(doc, model.period.label, PAGE_W - MARGIN_X, MARGIN_TOP + 4, { align: 'right' });
}

function drawFooter(doc: jsPDF, model: ReportModel, pageNumber: number, pageCount: number) {
  doc.setLineWidth(0.2);
  setDraw(doc, REPORT_COLORS.hairline);
  doc.line(MARGIN_X, PAGE_H - MARGIN_BOTTOM - FOOTER_H, PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM - FOOTER_H);
  doc.setFontSize(7.5);
  setText(doc, REPORT_COLORS.inkSubtle);
  const parts = [`Erstellt ${fmtDateTimeDe(model.generatedAt)}`];
  if (model.period.comparisonLabel) parts.push(`Vergleich: ${model.period.comparisonLabel}`);
  text(doc, parts.join('  ·  '), MARGIN_X, PAGE_H - MARGIN_BOTTOM - 2);
  text(doc, `Seite ${pageNumber} / ${pageCount}`, PAGE_W - MARGIN_X, PAGE_H - MARGIN_BOTTOM - 2, { align: 'right' });
}

function drawBrandMark(doc: jsPDF, x: number, y: number, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
  doc.setFillColor(r, g, b);
  doc.setLineWidth(0.4);
  // Simple monogram: rounded square with a chevron
  doc.roundedRect(x, y, 8, 8, 1.5, 1.5, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.9);
  doc.line(x + 2, y + 5, x + 4, y + 3);
  doc.line(x + 4, y + 3, x + 6, y + 5);
}

function toneToColor(tone: string): string {
  switch (tone) {
    case 'positive': return REPORT_COLORS.positive;
    case 'watch': return REPORT_COLORS.warn;
    case 'primary': return REPORT_COLORS.primary;
    default: return REPORT_COLORS.neutral;
  }
}

// ── Building blocks ────────────────────────────────────────────────
function drawSectionTitle(cur: PageCursor, model: ReportModel, title: string, eyebrow?: string) {
  ensureSpace(cur, model, eyebrow ? 12 : 8);
  const { doc } = cur;
  if (eyebrow) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, REPORT_COLORS.accent);
    text(doc, eyebrow.toUpperCase(), MARGIN_X, cur.y);
    cur.y += 4;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  setText(doc, REPORT_COLORS.ink);
  text(doc, title, MARGIN_X, cur.y);
  cur.y += 6;
  setDraw(doc, REPORT_COLORS.accent);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_X, cur.y - 1.4, MARGIN_X + 14, cur.y - 1.4);
  cur.y += 1;
}

function drawParagraph(cur: PageCursor, model: ReportModel, s: string, opts?: { size?: number; color?: string; leading?: number }) {
  const { doc } = cur;
  const size = opts?.size ?? 9.5;
  const color = opts?.color ?? REPORT_COLORS.ink;
  const leading = opts?.leading ?? size * 0.42;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(size);
  setText(doc, color);
  const wrapped = doc.splitTextToSize(sanitizePdfText(s), CONTENT_W) as string[];
  for (const line of wrapped) {
    ensureSpace(cur, model, leading + 1);
    doc.text(line, MARGIN_X, cur.y);
    cur.y += leading + 1;
  }
}

function drawKpiGrid(cur: PageCursor, model: ReportModel, kpis: KpiItem[]) {
  if (!kpis.length) return;
  const cols = kpis.length <= 2 ? 2 : kpis.length === 3 ? 3 : 4;
  const gap = 3;
  const cellW = (CONTENT_W - gap * (cols - 1)) / cols;
  const rows = Math.ceil(kpis.length / cols);
  const cellH = 20;
  const totalH = rows * cellH + (rows - 1) * gap;
  ensureSpace(cur, model, totalH + 2);
  const { doc } = cur;
  for (let i = 0; i < kpis.length; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = MARGIN_X + c * (cellW + gap);
    const y = cur.y + r * (cellH + gap);
    setFill(doc, REPORT_COLORS.surfaceAlt);
    setDraw(doc, REPORT_COLORS.hairline);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cellW, cellH, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    setText(doc, REPORT_COLORS.inkSubtle);
    text(doc, kpis[i].label.toUpperCase(), x + 3, y + 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setText(doc, REPORT_COLORS.ink);
    text(doc, kpis[i].value, x + 3, y + 11);
    const hintOrDelta = kpis[i].delta || kpis[i].hint;
    if (hintOrDelta) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      const col = kpis[i].delta
        ? (kpis[i].deltaTone === 'up' ? REPORT_COLORS.positive
          : kpis[i].deltaTone === 'down' ? REPORT_COLORS.negative
          : REPORT_COLORS.inkSubtle)
        : REPORT_COLORS.inkSubtle;
      setText(doc, col);
      text(doc, hintOrDelta, x + 3, y + 16.5);
    }
  }
  cur.y += totalH + 2;
}

function drawTable(cur: PageCursor, model: ReportModel, table: { columns: string[]; rows: string[][]; align?: Array<'left' | 'right' | 'center'> }) {
  if (!table.rows.length) return;
  const { doc } = cur;
  const cols = table.columns.length;
  const colW = CONTENT_W / cols;
  const rowH = 5.4;

  const drawHeader = () => {
    setFill(doc, REPORT_COLORS.surfaceAlt);
    doc.rect(MARGIN_X, cur.y, CONTENT_W, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setText(doc, REPORT_COLORS.ink);
    for (let c = 0; c < cols; c++) {
      const align = table.align?.[c] ?? 'left';
      const x = align === 'right' ? MARGIN_X + (c + 1) * colW - 2 : align === 'center' ? MARGIN_X + c * colW + colW / 2 : MARGIN_X + c * colW + 2;
      text(doc, table.columns[c], x, cur.y + 3.7, { align });
    }
    cur.y += rowH;
  };

  ensureSpace(cur, model, rowH * 2);
  drawHeader();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  setText(doc, REPORT_COLORS.ink);
  setDraw(doc, REPORT_COLORS.hairline);
  doc.setLineWidth(0.15);
  for (const row of table.rows) {
    if (cur.y + rowH > CONTENT_BOTTOM - FOOTER_H) {
      newPage(cur, model);
      drawHeader();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setText(doc, REPORT_COLORS.ink);
    }
    doc.line(MARGIN_X, cur.y, MARGIN_X + CONTENT_W, cur.y);
    for (let c = 0; c < cols; c++) {
      const align = table.align?.[c] ?? 'left';
      const x = align === 'right' ? MARGIN_X + (c + 1) * colW - 2 : align === 'center' ? MARGIN_X + c * colW + colW / 2 : MARGIN_X + c * colW + 2;
      text(doc, row[c] ?? '', x, cur.y + 3.7, { align });
    }
    cur.y += rowH;
  }
  cur.y += 1;
}

function drawBullets(cur: PageCursor, model: ReportModel, bullets: Array<{ label: string; value: string }>) {
  if (!bullets.length) return;
  const { doc } = cur;
  for (const b of bullets) {
    ensureSpace(cur, model, 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(doc, REPORT_COLORS.inkSubtle);
    text(doc, `- ${b.label}`, MARGIN_X, cur.y);
    setText(doc, REPORT_COLORS.ink);
    doc.setFont('helvetica', 'bold');
    text(doc, b.value, PAGE_W - MARGIN_X, cur.y, { align: 'right' });
    cur.y += 4.4;
  }
  cur.y += 1;
}

function drawChart(cur: PageCursor, model: ReportModel, chart: ChartSpec, sectionId: string): number {
  // Render chart to PNG dataURL
  let dataUrl: string;
  try {
    dataUrl = renderChart(chart);
  } catch (err) {
    throw new ReportRenderError(`Chart konnte nicht gerendert werden (${sectionId}): ${(err as Error).message}`, sectionId);
  }
  const widthMm = CONTENT_W;
  // aspect: line=960x380, bar=960x340, waterfall=960x340
  const aspect = chart.kind === 'line' ? 380 / 960 : 340 / 960;
  const heightMm = widthMm * aspect;
  ensureSpace(cur, model, heightMm + 4);
  cur.doc.addImage(dataUrl, 'PNG', MARGIN_X, cur.y, widthMm, heightMm, undefined, 'FAST');
  cur.y += heightMm + 3;
  return 1;
}

function drawSection(cur: PageCursor, model: ReportModel, section: ReportSection): number {
  drawSectionTitle(cur, model, section.title, section.eyebrow);
  if (section.summary) {
    drawParagraph(cur, model, section.summary);
    cur.y += 1;
  }
  if (section.kpis && section.kpis.length) {
    drawKpiGrid(cur, model, section.kpis);
  }
  let chartsDrawn = 0;
  if (section.chart) {
    chartsDrawn += drawChart(cur, model, section.chart, section.id);
  }
  if (section.bullets && section.bullets.length) {
    drawBullets(cur, model, section.bullets);
  }
  if (section.table) {
    drawTable(cur, model, section.table);
  }
  if (section.footnote) {
    ensureSpace(cur, model, 6);
    cur.doc.setFont('helvetica', 'italic');
    cur.doc.setFontSize(7.5);
    setText(cur.doc, REPORT_COLORS.inkSubtle);
    const wrapped = cur.doc.splitTextToSize(sanitizePdfText(section.footnote), CONTENT_W) as string[];
    for (const l of wrapped) {
      ensureSpace(cur, model, 3.2);
      cur.doc.text(l, MARGIN_X, cur.y);
      cur.y += 3.2;
    }
  }
  cur.y += 4;
  return chartsDrawn;
}

// ── Cover + Executive Summary ──────────────────────────────────────
function drawCover(cur: PageCursor, model: ReportModel) {
  const { doc } = cur;
  drawBrandMark(doc, MARGIN_X, MARGIN_TOP, REPORT_COLORS.accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setText(doc, REPORT_COLORS.ink);
  text(doc, 'HABITBATTLE · REPORT', MARGIN_X + 11, MARGIN_TOP + 5);

  doc.setFontSize(8.5);
  setText(doc, REPORT_COLORS.inkSubtle);
  text(doc, fmtDateTimeDe(model.generatedAt), PAGE_W - MARGIN_X, MARGIN_TOP + 5, { align: 'right' });

  cur.y = MARGIN_TOP + 26;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  setText(doc, REPORT_COLORS.ink);
  text(doc, model.title, MARGIN_X, cur.y);
  cur.y += 10;
  if (model.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    setText(doc, REPORT_COLORS.inkMuted);
    text(doc, model.subtitle, MARGIN_X, cur.y);
    cur.y += 7;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  setText(doc, REPORT_COLORS.inkSubtle);
  text(doc, `Zeitraum: ${model.period.label}`, MARGIN_X, cur.y);
  cur.y += 4.5;
  if (model.period.comparisonLabel) {
    text(doc, `Vergleich: ${model.period.comparisonLabel}`, MARGIN_X, cur.y);
    cur.y += 4.5;
  }
  if (model.updatedAt) {
    text(doc, `Datenstand: ${fmtDateTimeDe(model.updatedAt)}`, MARGIN_X, cur.y);
    cur.y += 4.5;
  }
  if (model.dataSources.length) {
    const src = model.dataSources.map(s => `${s.label}: ${s.count}`).join('  ·  ');
    text(doc, `Datenquellen: ${src}`, MARGIN_X, cur.y);
    cur.y += 4.5;
  }
  cur.y += 6;

  // Executive summary block
  const es = model.executiveSummary;
  setFill(doc, REPORT_COLORS.surfaceAlt);
  setDraw(doc, REPORT_COLORS.hairline);
  doc.setLineWidth(0.25);
  const boxTop = cur.y;
  const paddingY = 6, paddingX = 6;
  // measure content height
  const headlineLines = doc.splitTextToSize(sanitizePdfText(es.headline), CONTENT_W - paddingX * 2) as string[];
  const rowsMeta: Array<{ label: string; text: string }> = [];
  if (es.change) rowsMeta.push({ label: 'Was hat sich verändert', text: es.change });
  if (es.goalStatus) rowsMeta.push({ label: 'Zielstatus', text: es.goalStatus });
  if (es.strongestSignal) rowsMeta.push({ label: 'Stärkstes Signal', text: es.strongestSignal });
  if (es.watchout) rowsMeta.push({ label: 'Watchout', text: es.watchout });
  const metaLines = rowsMeta.map(r => doc.splitTextToSize(sanitizePdfText(`${r.label}: ${r.text}`), CONTENT_W - paddingX * 2) as string[]);
  const flatMetaCount = metaLines.reduce((s, arr) => s + arr.length, 0);
  const boxH = paddingY * 2 + headlineLines.length * 5.4 + 3 + flatMetaCount * 4.2 + 2;
  doc.roundedRect(MARGIN_X, boxTop, CONTENT_W, boxH, 2, 2, 'FD');

  // Tone band on left
  setFill(doc, toneToColor(es.tone));
  doc.rect(MARGIN_X, boxTop, 1.4, boxH, 'F');

  let ty = boxTop + paddingY + 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  setText(doc, toneToColor(es.tone));
  text(doc, 'EXECUTIVE SUMMARY', MARGIN_X + paddingX, ty);
  ty += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  setText(doc, REPORT_COLORS.ink);
  for (const line of headlineLines) {
    doc.text(line, MARGIN_X + paddingX, ty);
    ty += 5.4;
  }
  ty += 1.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setText(doc, REPORT_COLORS.inkMuted);
  for (let i = 0; i < rowsMeta.length; i++) {
    for (const line of metaLines[i]) {
      doc.text(line, MARGIN_X + paddingX, ty);
      ty += 4.2;
    }
  }
  cur.y = boxTop + boxH + 5;

  // Key KPIs directly below
  if (es.kpis.length) {
    drawKpiGrid(cur, model, es.kpis);
  }
}

// ── Public entry ────────────────────────────────────────────────────
export async function renderReportPdf(model: ReportModel, options: RenderOptions): Promise<RenderResult> {
  if (model.emptyReason) {
    throw new ReportRenderError(model.emptyReason);
  }
  const onProgress = options.onProgress ?? (() => { /* noop */ });
  onProgress('Bereite Report vor', 0.05);

  await waitForRenderReady();

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const cur: PageCursor = { doc, y: CONTENT_TOP, pageNumber: 1 };

  drawPageChrome(doc, model, 1);
  cur.y = CONTENT_TOP + HEADER_H + 4;

  onProgress('Zeichne Cover', 0.15);
  drawCover(cur, model);

  const selected = model.sections.filter(s => s.required || options.enabledSectionIds.has(s.id));
  if (selected.length === 0) {
    // still fine — cover-only report; but require at least 1 non-cover section for meaningful export
    throw new ReportRenderError('Keine Sektionen ausgewählt.');
  }

  let chartCount = 0;
  let expectedCharts = 0;
  for (const s of selected) if (s.chart) expectedCharts++;

  for (let i = 0; i < selected.length; i++) {
    const section = selected[i];
    onProgress(`Rendere Sektion: ${section.title}`, 0.2 + (i / selected.length) * 0.7);
    // Give a new page for major sections after cover
    if (cur.y > CONTENT_BOTTOM - FOOTER_H - 50) {
      newPage(cur, model);
    } else {
      // insert breathing room / soft break
      cur.y += 4;
    }
    chartCount += drawSection(cur, model, section);
  }

  if (expectedCharts > 0 && chartCount === 0) {
    throw new ReportRenderError('Keine Charts konnten erzeugt werden.');
  }

  // Draw footers on all pages
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    drawFooter(doc, model, i, total);
  }

  onProgress('Baue PDF', 0.98);
  const blob = doc.output('blob');
  const stamp = model.generatedAt.toISOString().slice(0, 10);
  const filename = `${model.kind}-report-${stamp}.pdf`;
  onProgress('Fertig', 1);
  return { filename, blob, pageCount: total, chartCount };
}
