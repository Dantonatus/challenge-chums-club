import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { TrainingCheckin } from './types';
import {
  longestStreak, currentStreak, visitsThisMonth, visitsLastMonth,
  avgVisitsPerWeek, mostCommonTimeBucket, bubbleHeatmapData,
  personalRecords, weeklyVisits, weekdayDistribution, monthlyVisits,
  restDayDistribution,
} from './analytics';

// ── Theme detection + color palettes ──

interface ThemeColors {
  bg: [number, number, number];
  fg: [number, number, number];
  muted: [number, number, number];
  accent: [number, number, number];
  accentLight: [number, number, number];
  cardBg: [number, number, number];
  white: [number, number, number];
}

const LIGHT: ThemeColors = {
  bg: [252, 252, 252],
  fg: [31, 31, 31],
  muted: [140, 140, 140],
  accent: [47, 155, 110],
  accentLight: [220, 245, 234],
  cardBg: [245, 245, 245],
  white: [255, 255, 255],
};

const DARK: ThemeColors = {
  bg: [20, 20, 20],
  fg: [235, 235, 235],
  muted: [160, 160, 160],
  accent: [63, 187, 126],
  accentLight: [30, 50, 40],
  cardBg: [35, 35, 35],
  white: [235, 235, 235],
};

function getThemeColors(): ThemeColors {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? DARK : LIGHT;
}

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function addPageBg(doc: jsPDF, c: ThemeColors) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...c.bg);
    doc.rect(0, 0, 210, 297, 'F');
  }
}

function addFooter(doc: jsPDF, c: ThemeColors) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...c.muted);
    doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy, HH:mm')} Uhr`, MARGIN, 290);
    doc.text(`Seite ${i} / ${pageCount}`, PAGE_W - MARGIN, 290, { align: 'right' });
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number, c: ThemeColors): number {
  if (y + needed > 280) {
    doc.addPage();
    doc.setFillColor(...c.bg);
    doc.rect(0, 0, 210, 297, 'F');
    return 16;
  }
  return y;
}

// ── Main export ──

export async function exportTrainingPDF(
  checkins: TrainingCheckin[],
  chartImages?: { label: string; dataUrl: string }[],
) {
  const c = getThemeColors();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Background for first page
  doc.setFillColor(...c.bg);
  doc.rect(0, 0, 210, 297, 'F');

  let y = 0;

  // ── Header ──
  doc.setFillColor(...c.accent);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(...c.white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Trainingsbericht', MARGIN, 13);

  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  if (sorted.length > 0) {
    const from = format(parseISO(sorted[0].checkin_date), 'dd. MMM yyyy', { locale: de });
    const to = format(parseISO(sorted[sorted.length - 1].checkin_date), 'dd. MMM yyyy', { locale: de });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${from} – ${to}`, PAGE_W - MARGIN, 13, { align: 'right' });
  }

  y = 30;

  // ── KPI Strip ──
  const kpis = [
    { label: 'Gesamt', value: `${checkins.length}` },
    { label: 'Diesen Monat', value: `${visitsThisMonth(checkins)}` },
    { label: 'Ø / Woche', value: `${avgVisitsPerWeek(checkins)}` },
    { label: 'Längste Streak', value: `${longestStreak(checkins)} T` },
    { label: 'Akt. Streak', value: `${currentStreak(checkins)} T` },
    { label: 'Lieblingszeit', value: `${mostCommonTimeBucket(checkins)}` },
  ];

  const boxW = (CONTENT_W - 5 * 3) / 6;
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (boxW + 3);
    doc.setFillColor(...c.accentLight);
    doc.roundedRect(x, y, boxW, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...c.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label, x + boxW / 2, y + 5, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...c.fg);
    doc.setFont('helvetica', 'bold');
    doc.text(k.value, x + boxW / 2, y + 13, { align: 'center' });
  });

  y += 24;

  // ── Bubble Heatmap ──
  doc.setFontSize(10);
  doc.setTextColor(...c.fg);
  doc.setFont('helvetica', 'bold');
  doc.text('Trainingszeiten', MARGIN, y);
  y += 5;

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const bubbles = bubbleHeatmapData(checkins);
  const allSlots = [...new Set(bubbles.map(b => b.slot))].sort();
  const maxCount = Math.max(1, ...bubbles.map(b => b.count));

  const colW = (CONTENT_W - 16) / Math.max(allSlots.length, 1);
  const rowH = 8;

  doc.setFontSize(6);
  doc.setTextColor(...c.muted);
  doc.setFont('helvetica', 'normal');
  allSlots.forEach((slot, i) => {
    doc.text(slot, MARGIN + 16 + i * colW + colW / 2, y, { align: 'center' });
  });
  y += 3;

  const bubbleMap = new Map(bubbles.map(b => [`${b.day}|${b.slot}`, b.count]));
  days.forEach((day, di) => {
    const rowY = y + di * rowH + rowH / 2;
    doc.setFontSize(7);
    doc.setTextColor(...c.fg);
    doc.setFont('helvetica', 'bold');
    doc.text(day, MARGIN + 10, rowY + 1, { align: 'right' });

    allSlots.forEach((slot, si) => {
      const count = bubbleMap.get(`${day}|${slot}`) || 0;
      if (count > 0) {
        const intensity = Math.min(count / maxCount, 1);
        const r = Math.round(c.accent[0] + (c.accentLight[0] - c.accent[0]) * (1 - intensity));
        const g = Math.round(c.accent[1] + (c.accentLight[1] - c.accent[1]) * (1 - intensity));
        const b_ = Math.round(c.accent[2] + (c.accentLight[2] - c.accent[2]) * (1 - intensity));
        doc.setFillColor(r, g, b_);
        const radius = 1 + intensity * 2.5;
        const cx = MARGIN + 16 + si * colW + colW / 2;
        doc.circle(cx, rowY, radius, 'F');
      }
    });
  });

  y += days.length * rowH + 6;

  // ── Personal Records ──
  const records = personalRecords(checkins);
  doc.setFontSize(10);
  doc.setTextColor(...c.fg);
  doc.setFont('helvetica', 'bold');
  doc.text('Persönliche Rekorde', MARGIN, y);
  y += 5;

  const recCards = [
    { emoji: '🌅', label: 'Frühester Check-in', value: records.earliestCheckin ? `${records.earliestCheckin.time} Uhr` : '–', sub: records.earliestCheckin?.date || '' },
    { emoji: '🌙', label: 'Spätester Check-in', value: records.latestCheckin ? `${records.latestCheckin.time} Uhr` : '–', sub: records.latestCheckin?.date || '' },
    { emoji: '🔥', label: 'Aktivster Tag', value: records.busiestDay ? `${records.busiestDay.count}× Check-in` : '–', sub: records.busiestDay?.date || '' },
    { emoji: '🏖️', label: 'Längste Pause', value: records.longestBreak ? `${records.longestBreak.days} Tage` : '–', sub: records.longestBreak ? `${format(parseISO(records.longestBreak.from), 'dd.MM.')} – ${format(parseISO(records.longestBreak.to), 'dd.MM.yy')}` : '' },
  ];

  const recW = (CONTENT_W - 3 * 3) / 4;
  recCards.forEach((rc, i) => {
    const x = MARGIN + i * (recW + 3);
    doc.setFillColor(...c.cardBg);
    doc.roundedRect(x, y, recW, 18, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...c.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(`${rc.emoji} ${rc.label}`, x + 3, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(...c.fg);
    doc.setFont('helvetica', 'bold');
    doc.text(rc.value, x + 3, y + 12);
    doc.setFontSize(6);
    doc.setTextColor(...c.muted);
    doc.setFont('helvetica', 'normal');
    doc.text(rc.sub, x + 3, y + 16);
  });

  y += 26;

  // ── Chart images ──
  if (chartImages && chartImages.length > 0) {
    for (const img of chartImages) {
      // Calculate image dimensions to fit content width
      const imgW = CONTENT_W;
      // Create a temporary image to get aspect ratio
      const ratio = await getImageAspectRatio(img.dataUrl);
      const imgH = imgW / ratio;

      y = ensureSpace(doc, y, imgH + 10, c);

      doc.setFontSize(10);
      doc.setTextColor(...c.fg);
      doc.setFont('helvetica', 'bold');
      doc.text(img.label, MARGIN, y);
      y += 4;

      doc.addImage(img.dataUrl, 'PNG', MARGIN, y, imgW, imgH);
      y += imgH + 8;
    }
  } else {
    // Fallback: render tables if no chart images provided
    y = renderTables(doc, checkins, y, c);
  }

  // ── Background + Footer ──
  addPageBg(doc, c);
  addFooter(doc, c);

  doc.save(`training-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function getImageAspectRatio(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width / img.height);
    img.onerror = () => resolve(16 / 9); // fallback
    img.src = dataUrl;
  });
}

function renderTables(doc: jsPDF, checkins: TrainingCheckin[], startY: number, c: ThemeColors): number {
  let y = startY;

  const tableStyles = {
    headStyles: { fillColor: c.accent as any, textColor: c.white as any, fontStyle: 'bold' as const, fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: c.fg as any },
    alternateRowStyles: { fillColor: c.cardBg as any },
    styles: { cellPadding: 1.5 },
    margin: { left: MARGIN, right: MARGIN },
    tableLineColor: c.muted as any,
  };

  // Weekly visits
  y = ensureSpace(doc, y, 40, c);
  doc.setFontSize(10);
  doc.setTextColor(...c.fg);
  doc.setFont('helvetica', 'bold');
  doc.text('Besuche pro Woche', MARGIN, y);
  y += 2;

  const weekly = weeklyVisits(checkins);
  autoTable(doc, {
    startY: y,
    head: [['Woche', 'Besuche', '']],
    body: weekly.slice(-20).map(w => [w.week, String(w.visits), '▮'.repeat(Math.min(w.visits, 20))]),
    ...tableStyles,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Weekday distribution
  y = ensureSpace(doc, y, 40, c);
  doc.setFontSize(10);
  doc.setTextColor(...c.fg);
  doc.setFont('helvetica', 'bold');
  doc.text('Wochentags-Verteilung', MARGIN, y);
  y += 2;

  const weekday = weekdayDistribution(checkins);
  autoTable(doc, {
    startY: y,
    head: [['Tag', 'Besuche', '']],
    body: weekday.map(w => [w.day, String(w.visits), '▮'.repeat(Math.min(w.visits, 30))]),
    ...tableStyles,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Monthly comparison
  y = ensureSpace(doc, y, 40, c);
  doc.setFontSize(10);
  doc.setTextColor(...c.fg);
  doc.setFont('helvetica', 'bold');
  doc.text('Monatsvergleich', MARGIN, y);
  y += 2;

  const monthly = monthlyVisits(checkins);
  autoTable(doc, {
    startY: y,
    head: [['Monat', 'Besuche', '']],
    body: monthly.map(m => [m.month, String(m.visits), '▮'.repeat(Math.min(m.visits, 30))]),
    ...tableStyles,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Rest day distribution
  y = ensureSpace(doc, y, 40, c);
  doc.setFontSize(10);
  doc.setTextColor(...c.fg);
  doc.setFont('helvetica', 'bold');
  doc.text('Ruhetage-Verteilung', MARGIN, y);
  y += 2;

  const rest = restDayDistribution(checkins);
  autoTable(doc, {
    startY: y,
    head: [['Ruhetage', 'Häufigkeit']],
    body: rest.map(r => [r.days, String(r.count)]),
    ...tableStyles,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  return y;
}
