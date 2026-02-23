import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { buildWeekColumns, groupWeeksByMonth, taskBarPosition, dateToPosition, todayPosition } from './ganttUtils';
import { GanttTask, PlanningProject, MilestoneWithClient, MILESTONE_TYPE_CONFIG, MilestoneType, Client } from './types';

// ── Layout constants (mm, A4 landscape) ──
const PAGE = { w: 297, h: 210 };
const M = 10; // margin
const LABEL_W = 58;
const FONT = { title: 13, subtitle: 8, month: 7, kw: 6, cell: 6, footer: 5.5, desc: 6, descTitle: 7 };
const ROW_H = { month: 8, kw: 6.5, task: 10 };
const HEADER_GAP = 14;
const CORNER = 1.8; // rounded-rect radius

// ── Helpers ──
function hex(c: string): { r: number; g: number; b: number } {
  const h = c.replace('#', '');
  if (h.length !== 6) return { r: 59, g: 130, b: 246 };
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}

/** Mix color with white to simulate opacity */
function fadedColor(color: { r: number; g: number; b: number }, alpha: number): { r: number; g: number; b: number } {
  return {
    r: Math.round(color.r * alpha + 255 * (1 - alpha)),
    g: Math.round(color.g * alpha + 255 * (1 - alpha)),
    b: Math.round(color.b * alpha + 255 * (1 - alpha)),
  };
}

/** Sanitize text for PDF-safe WinAnsi encoding (Helvetica) */
function sanitizeForPDF(text: string): string {
  return text
    .replace(/[\u2013\u2014]/g, '-')   // en-dash, em-dash → hyphen
    .replace(/\u2192|\u2190|\u21D2/g, '->') // arrows → ->
    .replace(/\u201E/g, '"')               // German opening quote „ → "
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .replace(/[\u2022\u25CF\u25CB]/g, '-') // bullets → hyphen
    .replace(/\u2026/g, '...')         // ellipsis
    .replace(/\u00A0/g, ' ')           // non-breaking space
    .replace(/\u2713|\u2714|\u2611/g, 'x') // checkmarks → x
    .replace(/[^\x00-\xFF]/g, '');     // strip remaining non-WinAnsi
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/ {2,}/g, ' ');
}

function htmlToPlainLines(html: string): { text: string; bold: boolean; bullet: boolean; indent?: number }[] {
  if (!/<[a-z][\s\S]*>/i.test(html)) {
    // Plain text – split by newlines
    return html.split('\n').filter(l => l.trim()).map(l => {
      const trimmed = l.trim();
      const isBullet = /^[-\u2013\u2022*]\s/.test(trimmed);
      const cleaned = sanitizeForPDF(decodeEntities(isBullet ? trimmed.replace(/^[-\u2013\u2022*]\s+/, '') : trimmed));
      return { text: cleaned, bold: false, bullet: isBullet };
    });
  }

  // Order-preserving HTML parser: walk through the HTML sequentially
  const lines: { text: string; bold: boolean; bullet: boolean; indent?: number }[] = [];

  // First normalize: replace <br> with newlines, close block elements with newlines
  let normalized = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div)>/gi, '\n');

  // Process tokens sequentially using a simple state machine
  const tokenRegex = /<(\/?)(\w+)[^>]*>|([^<]+)/gi;
  let match: RegExpExecArray | null;
  let inBold = false;
  let inHeading = false;
  let listDepth = 0;
  let inLi = false;
  let currentText = '';

  const flushText = () => {
    const text = currentText.trim();
    if (text) {
      // Split by newlines to handle inline breaks
      for (const segment of text.split('\n')) {
        const t = segment.trim();
        if (t) {
          lines.push({ text: sanitizeForPDF(decodeEntities(t)), bold: inBold || inHeading, bullet: inLi, indent: inLi ? Math.max(0, listDepth - 1) : 0 });
        }
      }
    }
    currentText = '';
  };

  while ((match = tokenRegex.exec(normalized)) !== null) {
    const [, isClose, tagName, textContent] = match;

    if (textContent) {
      currentText += textContent;
      continue;
    }

    const tag = (tagName || '').toLowerCase();

    if (!isClose) {
      // Opening tag
      if (tag === 'li') { flushText(); inLi = true; }
      else if (tag === 'ul' || tag === 'ol') { flushText(); listDepth++; }
      else if (/^h[1-3]$/.test(tag)) { flushText(); inHeading = true; }
      else if (tag === 'b' || tag === 'strong') { flushText(); inBold = true; }
    } else {
      // Closing tag
      if (tag === 'li') { flushText(); inLi = false; }
      else if (tag === 'ul' || tag === 'ol') { flushText(); listDepth = Math.max(0, listDepth - 1); }
      else if (/^h[1-3]$/.test(tag)) { flushText(); inHeading = false; }
      else if (tag === 'b' || tag === 'strong') { flushText(); inBold = false; }
    }
  }
  flushText();

  return lines;
}

// ── Main export ──
export function exportGanttPDF(
  project: PlanningProject,
  tasks: GanttTask[],
  milestones: MilestoneWithClient[],
  client: Client
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const contentW = PAGE.w - 2 * M;
  const gridW = contentW - LABEL_W;

  // ── Timeline range (same logic as GanttChart.tsx) ──
  const rangeStart = new Date(project.start_date);
  let rangeEnd = project.end_date ? new Date(project.end_date) : new Date(rangeStart.getTime() + 90 * 86400000);
  for (const t of tasks) {
    const tEnd = new Date(t.end_date);
    if (tEnd > rangeEnd) rangeEnd = tEnd;
  }
  rangeEnd = new Date(rangeEnd.getTime() + 14 * 86400000); // +14d buffer

  const weeks = buildWeekColumns(rangeStart, rangeEnd);
  const monthGroups = groupWeeksByMonth(weeks);
  if (weeks.length === 0) return;

  const weekW = gridW / weeks.length;
  const todayPos = todayPosition(weeks);
  let y = M;

  // ════════════════════════════════════════════
  //  PAGE 1+  —  GANTT CHART
  // ════════════════════════════════════════════

  // ── Title ──
  doc.setFontSize(FONT.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(sanitizeForPDF(`${client.name} – ${project.name}`), M, y + 5);
  doc.setFontSize(FONT.subtitle);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(
    `${format(rangeStart, 'dd.MM.yyyy', { locale: de })} – ${format(rangeEnd, 'dd.MM.yyyy', { locale: de })}`,
    M, y + 10
  );
  y += HEADER_GAP;

  // ── Month header row ──
  const drawMonthKwHeaders = () => {
    let mx = M + LABEL_W;
    doc.setFontSize(FONT.month);
    doc.setFont('helvetica', 'bold');

    // Label column header
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(M, y, LABEL_W, ROW_H.month, CORNER, CORNER, 'F');
    doc.setTextColor(100, 100, 100);
    doc.text('Aufgabe', M + 3, y + ROW_H.month / 2 + 1.5);

    for (const group of monthGroups) {
      const w = group.colSpan * weekW;
      doc.setFillColor(245, 245, 245);
      doc.roundedRect(mx + 0.3, y + 0.3, w - 0.6, ROW_H.month - 0.6, CORNER, CORNER, 'F');
      doc.setTextColor(50, 50, 50);
      doc.text(group.label, mx + w / 2, y + ROW_H.month / 2 + 1.5, { align: 'center' });
      mx += w;
    }
    y += ROW_H.month + 0.5;

    // ── KW header row ──
    let kx = M + LABEL_W;
    doc.setFontSize(FONT.kw);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(M, y, LABEL_W, ROW_H.kw, CORNER, CORNER, 'F');

    for (const week of weeks) {
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(kx + 0.2, y + 0.2, weekW - 0.4, ROW_H.kw - 0.4, 1, 1, 'F');
      doc.setTextColor(140, 140, 140);
      doc.text(week.label, kx + weekW / 2, y + ROW_H.kw / 2 + 1.2, { align: 'center' });
      kx += weekW;
    }
    y += ROW_H.kw + 0.5;
  };

  drawMonthKwHeaders();

  // ── Task rows ──
  for (const task of tasks) {
    // Page break check
    if (y + ROW_H.task > PAGE.h - M - 10) {
      addFooter(doc, client, project);
      doc.addPage();
      y = M;
      drawMonthKwHeaders();
    }

    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const bar = taskBarPosition(taskStart, taskEnd, weeks);

    // Alternating row background
    doc.setFillColor(252, 252, 252);
    doc.roundedRect(M, y, contentW, ROW_H.task, CORNER, CORNER, 'F');

    // Grid lines (subtle)
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.15);
    for (let i = 1; i < weeks.length; i++) {
      const lx = M + LABEL_W + i * weekW;
      doc.line(lx, y, lx, y + ROW_H.task);
    }

    // Label divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(M + LABEL_W, y, M + LABEL_W, y + ROW_H.task);

    // Label text (up to 2 lines)
    doc.setFontSize(FONT.cell);
    doc.setFont('helvetica', task.is_completed ? 'italic' : 'normal');
    doc.setTextColor(task.is_completed ? 160 : 40, task.is_completed ? 160 : 40, task.is_completed ? 160 : 40);
    const labelLines = doc.splitTextToSize(task.title, LABEL_W - 6);
    const lineCount = Math.min(labelLines.length, 2);
    const lineH = 3.2;
    const startY = y + ROW_H.task / 2 - ((lineCount - 1) * lineH) / 2 + 1;
    for (let li = 0; li < lineCount; li++) {
      doc.text(labelLines[li], M + 3, startY + li * lineH);
    }

    // Bar
    const barX = M + LABEL_W + (bar.left / 100) * gridW;
    const barW = Math.max((bar.width / 100) * gridW, 2);
    const barColor = hex(task.color || client.color);
    const faded = fadedColor(barColor, task.is_completed ? 0.5 : 0.8);
    doc.setFillColor(faded.r, faded.g, faded.b);
    doc.roundedRect(barX, y + 2, barW, ROW_H.task - 4, CORNER, CORNER, 'F');

    // Completed checkmark (drawn as lines instead of Unicode)
    if (task.is_completed) {
      const cx = barX + 3;
      const cy = y + ROW_H.task / 2;
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.5);
      doc.line(cx - 1.2, cy, cx - 0.2, cy + 1.2);
      doc.line(cx - 0.2, cy + 1.2, cx + 1.5, cy - 1);
    }

    // Milestones on this task
    const taskMilestones = milestones.filter(m => {
      const mDate = new Date(m.date);
      return mDate >= taskStart && mDate <= taskEnd;
    });
    for (const ms of taskMilestones) {
      const mPos = dateToPosition(new Date(ms.date), weeks);
      const mx = M + LABEL_W + mPos * gridW;
      const config = MILESTONE_TYPE_CONFIG[ms.milestone_type as MilestoneType] || MILESTONE_TYPE_CONFIG.general;
      const mc = hex(config.color);
      doc.setFillColor(mc.r, mc.g, mc.b);
      const size = 2.2;
      const cy = y + ROW_H.task / 2;
      doc.triangle(mx, cy - size, mx + size, cy, mx, cy + size, 'F');
      doc.triangle(mx, cy - size, mx - size, cy, mx, cy + size, 'F');
    }

    y += ROW_H.task;
  }

  // ── Today line ──
  if (todayPos !== null) {
    const todayX = M + LABEL_W + (todayPos / 100) * gridW;
    const topY = M + HEADER_GAP;
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.4);
    doc.line(todayX, topY, todayX, y);
    doc.setFillColor(59, 130, 246);
    doc.setFontSize(4.5);
    doc.setTextColor(255, 255, 255);
    const labelW2 = 8;
    doc.roundedRect(todayX - labelW2 / 2, topY, labelW2, 3.5, 0.8, 0.8, 'F');
    doc.text('Heute', todayX, topY + 2.5, { align: 'center' }); // "Heute" is WinAnsi-safe
  }

  addFooter(doc, client, project);

  // ════════════════════════════════════════════
  //  PAGE 2+  —  PHASE DESCRIPTIONS
  // ════════════════════════════════════════════
  const withDesc = tasks.filter(t => t.description?.trim());
  if (withDesc.length > 0) {
    doc.addPage();
    y = M;

    doc.setFontSize(FONT.title);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text('Phasenbeschreibungen', M, y + 5);
    doc.setFontSize(FONT.subtitle);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(sanitizeForPDF(`${client.name} – ${project.name}`), M, y + 10);
    y += HEADER_GAP;

    for (const task of withDesc) {
      const color = hex(task.color || client.color);
      const lines = htmlToPlainLines(task.description!);
      const dateStr = `${format(new Date(task.start_date), 'dd.MM.yyyy', { locale: de })} – ${format(new Date(task.end_date), 'dd.MM.yyyy', { locale: de })}`;

      // Estimate height
      const textW = contentW - 10;
      let estH = 9; // title + date + padding
      for (const line of lines) {
        const indent = (line.indent || 0) * 4;
        const prefix = line.bullet ? '- ' : '';
        const wrapped = doc.splitTextToSize(`${prefix}${line.text}`, textW - indent);
        estH += wrapped.length * 2.6;
      }
      estH = Math.max(estH, 14);

      // Page break
      if (y + estH > PAGE.h - M - 10) {
        addFooter(doc, client, project);
        doc.addPage();
        y = M;
      }

      // Card background
      doc.setFillColor(250, 250, 250);
      doc.roundedRect(M, y, contentW, estH, CORNER + 0.5, CORNER + 0.5, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.roundedRect(M, y, contentW, estH, CORNER + 0.5, CORNER + 0.5, 'S');

      // Color strip
      doc.setFillColor(color.r, color.g, color.b);
      doc.roundedRect(M, y, 2.5, estH, CORNER, CORNER, 'F');

      // Title
      let ty = y + 3.8;
      doc.setFontSize(FONT.descTitle);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(sanitizeForPDF(task.title), M + 6, ty);

      // Date
      doc.setFontSize(FONT.footer);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(140, 140, 140);
      doc.text(dateStr, M + 6, ty + 3);
      ty += 5.5;

      // Description lines
      doc.setFontSize(FONT.desc);
      for (const line of lines) {
        doc.setFont('helvetica', line.bold ? 'bold' : 'normal');
        doc.setTextColor(60, 60, 60);
        const indent = (line.indent || 0) * 4;
        const prefix = line.bullet ? '- ' : '';
        const wrapped = doc.splitTextToSize(`${prefix}${line.text}`, textW - indent);
        for (const wl of wrapped) {
          doc.text(wl, M + 6 + indent, ty);
          ty += 2.6;
        }
      }

      y += estH + 1.0;
    }

    addFooter(doc, client, project);
  }

  doc.save(`Projektplanung_${client.name}_${project.name}.pdf`);
}

function addFooter(doc: jsPDF, client: Client, project: PlanningProject) {
  doc.setFontSize(5.5);
  doc.setTextColor(170, 170, 170);
  doc.setFont('helvetica', 'normal');
  const fy = PAGE.h - M + 2;
  doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, M, fy);
  doc.text(sanitizeForPDF(`${client.name} – ${project.name}`), PAGE.w - M, fy, { align: 'right' });
}
