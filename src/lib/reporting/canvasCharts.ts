// Deterministic canvas-based chart rendering.
// Produces PNG dataURLs that are embedded into the PDF at a fixed resolution.
// No DOM/React dependency — safe to call in any context.

import type { LineChartSpec, BarChartSpec, WaterfallSpec, ChartSpec } from './types';
import { REPORT_COLORS } from './reportFormatting';

const DPR = 2;                    // render @2x for crisp print
const FONT = '13px "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_SMALL = '11px "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_TICK = '11px "Helvetica Neue", Helvetica, Arial, sans-serif';

function createCanvas(widthPx: number, heightPx: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = widthPx * DPR;
  canvas.height = heightPx * DPR;
  canvas.style.width = `${widthPx}px`;
  canvas.style.height = `${heightPx}px`;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');
  ctx.scale(DPR, DPR);
  ctx.textBaseline = 'top';
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min - 1, min, min + 1];
  const range = max - min;
  const rough = range / count;
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / pow;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * pow;
  const first = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = first; v <= max + step * 0.5; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

function fmtTick(v: number): string {
  if (Math.abs(v) >= 1000) return v.toLocaleString('de-DE');
  if (Number.isInteger(v)) return v.toString();
  return v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// ── Line chart ──────────────────────────────────────────────────────
export function renderLineChart(spec: LineChartSpec, widthPx = 960, heightPx = 380): string {
  const { canvas, ctx } = createCanvas(widthPx, heightPx);

  // white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const padL = 52, padR = 24, padT = 18, padB = 44;
  const plotW = widthPx - padL - padR;
  const plotH = heightPx - padT - padB;

  // compute x domain
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const s of spec.series) {
    for (const p of s.points) {
      if (p.x < xMin) xMin = p.x;
      if (p.x > xMax) xMax = p.x;
      if (p.y < yMin) yMin = p.y;
      if (p.y > yMax) yMax = p.y;
    }
  }
  for (const h of spec.hLines ?? []) { if (h.y < yMin) yMin = h.y; if (h.y > yMax) yMax = h.y; }
  for (const b of spec.bands ?? []) {
    if (b.y0 < yMin) yMin = b.y0; if (b.y1 > yMax) yMax = b.y1;
    if (b.x0 < xMin) xMin = b.x0; if (b.x1 > xMax) xMax = b.x1;
  }
  if (!isFinite(xMin) || !isFinite(xMax)) { xMin = 0; xMax = 1; }
  if (!isFinite(yMin) || !isFinite(yMax)) { yMin = 0; yMax = 1; }
  if (xMin === xMax) { xMin -= 0.5; xMax += 0.5; }

  if (spec.yDomain) { [yMin, yMax] = spec.yDomain; }
  else {
    const pad = (yMax - yMin) * 0.08 || 0.5;
    yMin -= pad; yMax += pad;
  }

  const xToPx = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * plotW;
  const yToPx = (y: number) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  // Y grid + labels
  ctx.font = FONT_TICK;
  ctx.fillStyle = REPORT_COLORS.inkSubtle;
  ctx.strokeStyle = REPORT_COLORS.hairline;
  ctx.lineWidth = 1;
  const yTicks = niceTicks(yMin, yMax, 5);
  for (const t of yTicks) {
    if (t < yMin || t > yMax) continue;
    const y = yToPx(t);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtTick(t), padL - 8, y);
  }

  // Bands
  for (const b of spec.bands ?? []) {
    ctx.fillStyle = withAlpha(b.color, b.alpha ?? 0.15);
    const x0 = xToPx(b.x0), x1 = xToPx(b.x1);
    const y0 = yToPx(b.y1), y1 = yToPx(b.y0);
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }

  // Axis
  ctx.strokeStyle = REPORT_COLORS.hairline;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // X ticks
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = REPORT_COLORS.inkSubtle;
  const xTicks = spec.xTicks ?? deriveXTicks(spec, xMin, xMax);
  for (const t of xTicks) {
    if (t.x < xMin - 0.001 || t.x > xMax + 0.001) continue;
    const x = xToPx(t.x);
    ctx.strokeStyle = REPORT_COLORS.hairline;
    ctx.beginPath();
    ctx.moveTo(x, padT + plotH);
    ctx.lineTo(x, padT + plotH + 3);
    ctx.stroke();
    ctx.fillText(t.label, x, padT + plotH + 6);
  }

  // Horizontal reference lines
  for (const h of spec.hLines ?? []) {
    const y = yToPx(h.y);
    ctx.strokeStyle = h.color;
    ctx.lineWidth = 1.5;
    if (h.dashed) ctx.setLineDash([5, 4]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = h.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(h.label, padL + 4, y - 2);
  }

  // Series
  for (const s of spec.series) {
    if (s.points.length === 0) continue;
    if (s.fill) {
      ctx.fillStyle = withAlpha(s.color, 0.18);
      ctx.beginPath();
      ctx.moveTo(xToPx(s.points[0].x), yToPx(yMin));
      for (const p of s.points) ctx.lineTo(xToPx(p.x), yToPx(p.y));
      ctx.lineTo(xToPx(s.points[s.points.length - 1].x), yToPx(yMin));
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    if (s.dashed) ctx.setLineDash([6, 4]); else ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < s.points.length; i++) {
      const px = xToPx(s.points[i].x);
      const py = yToPx(s.points[i].y);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // small point markers if few points
    if (s.points.length <= 20 && !s.dashed) {
      ctx.fillStyle = s.color;
      for (const p of s.points) {
        ctx.beginPath();
        ctx.arc(xToPx(p.x), yToPx(p.y), 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Markers with labels
  for (const m of spec.markers ?? []) {
    ctx.fillStyle = m.color || REPORT_COLORS.ink;
    const px = xToPx(m.x), py = yToPx(m.y);
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (m.label) {
      ctx.font = FONT_SMALL;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = REPORT_COLORS.ink;
      ctx.fillText(m.label, px + 5, py - 4);
    }
  }

  // Legend (top-right)
  drawLegend(ctx, spec.series.map(s => ({ label: s.name, color: s.color, dashed: s.dashed })), widthPx - padR, padT - 4);

  return canvas.toDataURL('image/png');
}

function deriveXTicks(spec: LineChartSpec, xMin: number, xMax: number): Array<{ x: number; label: string }> {
  if (spec.xLabels && spec.xLabels.length > 0) {
    const step = Math.max(1, Math.ceil(spec.xLabels.length / 10));
    const ticks: Array<{ x: number; label: string }> = [];
    for (let i = 0; i < spec.xLabels.length; i += step) ticks.push({ x: i, label: spec.xLabels[i] });
    return ticks;
  }
  return niceTicks(xMin, xMax, 6).map(v => ({ x: v, label: fmtTick(v) }));
}

// ── Bar chart ───────────────────────────────────────────────────────
export function renderBarChart(spec: BarChartSpec, widthPx = 960, heightPx = 340): string {
  const { canvas, ctx } = createCanvas(widthPx, heightPx);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const padL = 44, padR = 20, padT = 18, padB = 52;
  const plotW = widthPx - padL - padR;
  const plotH = heightPx - padT - padB;

  const values = spec.bars.map(b => b.value);
  let yMax = Math.max(spec.targetLine?.y ?? 0, ...values, 1);
  yMax = Math.ceil(yMax * 1.15);
  const yMin = 0;

  const n = spec.bars.length;
  const gap = 6;
  const barW = Math.max(4, (plotW - gap * (n - 1)) / n);
  const yToPx = (y: number) => padT + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  // Y grid
  ctx.font = FONT_TICK;
  const yTicks = niceTicks(yMin, yMax, 4);
  for (const t of yTicks) {
    const y = yToPx(t);
    ctx.strokeStyle = REPORT_COLORS.hairline;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillStyle = REPORT_COLORS.inkSubtle;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtTick(t), padL - 6, y);
  }

  // Bars
  for (let i = 0; i < n; i++) {
    const b = spec.bars[i];
    const x = padL + i * (barW + gap);
    const y = yToPx(b.value);
    const h = padT + plotH - y;
    ctx.fillStyle = b.color || (b.isTarget ? REPORT_COLORS.accent : REPORT_COLORS.primary);
    ctx.fillRect(x, y, barW, h);
  }

  // X labels
  ctx.fillStyle = REPORT_COLORS.inkSubtle;
  ctx.font = FONT_TICK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const labelStep = Math.max(1, Math.ceil(n / 14));
  for (let i = 0; i < n; i++) {
    if (i % labelStep !== 0) continue;
    const x = padL + i * (barW + gap) + barW / 2;
    ctx.fillText(spec.bars[i].label, x, padT + plotH + 6);
  }

  // Target line
  if (spec.targetLine) {
    const y = yToPx(spec.targetLine.y);
    ctx.strokeStyle = spec.targetLine.color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = FONT_SMALL;
    ctx.fillStyle = spec.targetLine.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(spec.targetLine.label, padL + 4, y - 2);
  }

  return canvas.toDataURL('image/png');
}

// ── Waterfall chart (Composition Bridge) ────────────────────────────
export function renderWaterfall(spec: WaterfallSpec, widthPx = 960, heightPx = 340): string {
  const { canvas, ctx } = createCanvas(widthPx, heightPx);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  const padL = 44, padR = 20, padT = 24, padB = 56;
  const plotW = widthPx - padL - padR;
  const plotH = heightPx - padT - padB;

  const cums = spec.steps.map(s => s.cumulative);
  const minY = Math.min(...cums) - 1;
  const maxY = Math.max(...cums) + 1;
  const yToPx = (y: number) => padT + plotH - ((y - minY) / (maxY - minY)) * plotH;

  // Y grid
  ctx.font = FONT_TICK;
  const yTicks = niceTicks(minY, maxY, 4);
  for (const t of yTicks) {
    const y = yToPx(t);
    ctx.strokeStyle = REPORT_COLORS.hairline;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();
    ctx.fillStyle = REPORT_COLORS.inkSubtle;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtTick(t), padL - 6, y);
  }

  const n = spec.steps.length;
  const gap = 30;
  const barW = Math.max(20, (plotW - gap * (n - 1)) / n);

  let prevCum = spec.steps[0]?.cumulative ?? 0;
  for (let i = 0; i < n; i++) {
    const s = spec.steps[i];
    const x = padL + i * (barW + gap);
    let top: number, bottom: number, color: string;
    if (s.kind === 'anchor') {
      top = yToPx(s.cumulative);
      bottom = yToPx(minY);
      color = REPORT_COLORS.primary;
    } else {
      const start = prevCum;
      const end = s.cumulative;
      top = yToPx(Math.max(start, end));
      bottom = yToPx(Math.min(start, end));
      color = s.kind === 'positive' ? REPORT_COLORS.positive : REPORT_COLORS.negative;
      // faint connector to previous bar
      ctx.strokeStyle = REPORT_COLORS.hairline;
      ctx.setLineDash([3, 3]);
      const prevX = padL + (i - 1) * (barW + gap) + barW;
      const yLine = yToPx(prevCum);
      ctx.beginPath();
      ctx.moveTo(prevX, yLine);
      ctx.lineTo(x, yLine);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = color;
    ctx.fillRect(x, top, barW, Math.max(2, bottom - top));

    // value label above bar
    ctx.font = FONT_SMALL;
    ctx.fillStyle = REPORT_COLORS.ink;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    const displayVal = s.kind === 'anchor'
      ? `${fmtTick(s.value)} ${spec.unit}`
      : `${s.value > 0 ? '+' : ''}${fmtTick(s.value)} ${spec.unit}`;
    ctx.fillText(displayVal, x + barW / 2, top - 3);
    // x label
    ctx.textBaseline = 'top';
    ctx.fillStyle = REPORT_COLORS.inkSubtle;
    ctx.fillText(s.label, x + barW / 2, padT + plotH + 8);

    prevCum = s.cumulative;
  }

  return canvas.toDataURL('image/png');
}

// ── Utilities ───────────────────────────────────────────────────────
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  items: Array<{ label: string; color: string; dashed?: boolean }>,
  rightX: number,
  topY: number,
) {
  ctx.font = FONT_SMALL;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  let x = rightX;
  const y = topY;
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const textW = ctx.measureText(it.label).width;
    ctx.fillStyle = REPORT_COLORS.ink;
    ctx.fillText(it.label, x, y);
    x -= textW + 6;
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2;
    if (it.dashed) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    x -= 22;
  }
}

export function renderChart(spec: ChartSpec, widthPx?: number, heightPx?: number): string {
  switch (spec.kind) {
    case 'line': return renderLineChart(spec, widthPx, heightPx);
    case 'bar': return renderBarChart(spec, widthPx, heightPx);
    case 'waterfall': return renderWaterfall(spec, widthPx, heightPx);
  }
}
