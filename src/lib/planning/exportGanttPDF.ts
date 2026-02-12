import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { buildWeekColumns, groupWeeksByMonth, taskBarPosition, dateToPosition } from './ganttUtils';
import { GanttTask, PlanningProject, MilestoneWithClient, MILESTONE_TYPE_CONFIG, MilestoneType, Client } from './types';

const A4_LANDSCAPE = { w: 297, h: 210 }; // mm
const MARGIN = 12;
const HEADER_HEIGHT = 20;
const MONTH_ROW = 8;
const KW_ROW = 7;
const TASK_ROW = 10;
const LABEL_COL = 55;
const FONT_SIZE = { title: 14, subtitle: 9, header: 7, cell: 6.5, footer: 6 };

export function exportGanttPDF(
  project: PlanningProject,
  tasks: GanttTask[],
  milestones: MilestoneWithClient[],
  client: Client
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = A4_LANDSCAPE.w - 2 * MARGIN;
  const gridW = pageW - LABEL_COL;
  const rangeStart = new Date(project.start_date);
  const rangeEnd = project.end_date ? new Date(project.end_date) : new Date(rangeStart.getTime() + 90 * 24 * 60 * 60 * 1000);

  const weeks = buildWeekColumns(rangeStart, rangeEnd);
  const monthGroups = groupWeeksByMonth(weeks);
  if (weeks.length === 0) return;

  const weekW = gridW / weeks.length;
  let y = MARGIN;

  // === Title ===
  doc.setFontSize(FONT_SIZE.title);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(`${client.name} – ${project.name}`, MARGIN, y + 5);
  y += HEADER_HEIGHT;

  // === Month header ===
  let mx = MARGIN + LABEL_COL;
  doc.setFontSize(FONT_SIZE.header);
  doc.setFont('helvetica', 'bold');
  for (const group of monthGroups) {
    const w = group.colSpan * weekW;
    doc.setFillColor(240, 240, 240);
    doc.rect(mx, y, w, MONTH_ROW, 'F');
    doc.setDrawColor(200, 200, 200);
    doc.rect(mx, y, w, MONTH_ROW, 'S');
    doc.setTextColor(50, 50, 50);
    doc.text(group.label, mx + w / 2, y + MONTH_ROW / 2 + 1, { align: 'center' });
    mx += w;
  }
  // Label column header
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, y, LABEL_COL, MONTH_ROW, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(MARGIN, y, LABEL_COL, MONTH_ROW, 'S');
  doc.setTextColor(100, 100, 100);
  doc.text('Aufgabe', MARGIN + 3, y + MONTH_ROW / 2 + 1);
  y += MONTH_ROW;

  // === KW header ===
  let kx = MARGIN + LABEL_COL;
  doc.setFontSize(FONT_SIZE.cell);
  doc.setFont('helvetica', 'normal');
  for (const week of weeks) {
    doc.setFillColor(248, 248, 248);
    doc.rect(kx, y, weekW, KW_ROW, 'F');
    doc.setDrawColor(210, 210, 210);
    doc.rect(kx, y, weekW, KW_ROW, 'S');
    doc.setTextColor(120, 120, 120);
    doc.text(week.label, kx + weekW / 2, y + KW_ROW / 2 + 1, { align: 'center' });
    kx += weekW;
  }
  doc.rect(MARGIN, y, LABEL_COL, KW_ROW, 'S');
  y += KW_ROW;

  // === Task rows ===
  doc.setFontSize(FONT_SIZE.cell);
  for (const task of tasks) {
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.end_date);
    const bar = taskBarPosition(taskStart, taskEnd, weeks);

    // Row bg
    doc.setDrawColor(230, 230, 230);
    doc.rect(MARGIN, y, pageW, TASK_ROW, 'S');

    // Label
    doc.setFont('helvetica', task.is_completed ? 'italic' : 'normal');
    doc.setTextColor(task.is_completed ? 150 : 30, task.is_completed ? 150 : 30, task.is_completed ? 150 : 30);
    const labelText = doc.splitTextToSize(task.title, LABEL_COL - 6);
    doc.text(labelText[0] || task.title, MARGIN + 3, y + TASK_ROW / 2 + 1);

    // Bar
    const barX = MARGIN + LABEL_COL + (bar.left / 100) * gridW;
    const barW = Math.max((bar.width / 100) * gridW, 2);
    const barColor = hexToRgb(task.color || client.color);
    doc.setFillColor(barColor.r, barColor.g, barColor.b);
    doc.roundedRect(barX, y + 2, barW, TASK_ROW - 4, 1.5, 1.5, 'F');

    // Completed checkmark
    if (task.is_completed) {
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(5);
      doc.text('✓', barX + 2, y + TASK_ROW / 2 + 1);
      doc.setFontSize(FONT_SIZE.cell);
    }

    // Milestones on this task
    const taskMilestones = milestones.filter(m => {
      const mDate = new Date(m.date);
      return mDate >= taskStart && mDate <= taskEnd;
    });
    for (const ms of taskMilestones) {
      const mPos = dateToPosition(new Date(ms.date), weeks);
      const mx2 = MARGIN + LABEL_COL + mPos * gridW;
      const config = MILESTONE_TYPE_CONFIG[ms.milestone_type as MilestoneType] || MILESTONE_TYPE_CONFIG.general;
      const mc = hexToRgb(config.color);
      doc.setFillColor(mc.r, mc.g, mc.b);
      // Diamond shape (rotated square)
      const size = 2.5;
      const cy2 = y + TASK_ROW / 2;
      doc.triangle(mx2, cy2 - size, mx2 + size, cy2, mx2, cy2 + size, 'F');
      doc.triangle(mx2, cy2 - size, mx2 - size, cy2, mx2, cy2 + size, 'F');
    }

    y += TASK_ROW;

    // Page break if needed
    if (y > A4_LANDSCAPE.h - MARGIN - 15) {
      doc.addPage();
      y = MARGIN;
    }
  }

  // === Footer ===
  doc.setFontSize(FONT_SIZE.footer);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  const footerY = A4_LANDSCAPE.h - MARGIN;
  doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy HH:mm', { locale: de })}`, MARGIN, footerY);
  doc.text(`${client.name} – ${project.name}`, A4_LANDSCAPE.w - MARGIN, footerY, { align: 'right' });

  doc.save(`Projektplanung_${client.name}_${project.name}.pdf`);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return { r: 59, g: 130, b: 246 }; // fallback blue
  return {
    r: parseInt(cleaned.substring(0, 2), 16),
    g: parseInt(cleaned.substring(2, 4), 16),
    b: parseInt(cleaned.substring(4, 6), 16),
  };
}
