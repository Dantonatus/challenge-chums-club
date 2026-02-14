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

const BLUE = [37, 99, 235] as const;       // primary blue
const BLUE_LIGHT = [219, 234, 254] as const;
const GRAY = [107, 114, 128] as const;
const WHITE = [255, 255, 255] as const;
const DARK = [17, 24, 39] as const;

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy, HH:mm')} Uhr`, MARGIN, 290);
    doc.text(`Seite ${i} / ${pageCount}`, PAGE_W - MARGIN, 290, { align: 'right' });
  }
}

export function exportTrainingPDF(checkins: TrainingCheckin[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  let y = 0;

  // ── Header ──
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Trainingsbericht', MARGIN, 13);

  // Date range
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

  const boxW = (CONTENT_W - 5 * 3) / 6; // 6 boxes, 3mm gap
  kpis.forEach((k, i) => {
    const x = MARGIN + i * (boxW + 3);
    doc.setFillColor(...BLUE_LIGHT);
    doc.roundedRect(x, y, boxW, 16, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label, x + boxW / 2, y + 5, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(k.value, x + boxW / 2, y + 13, { align: 'center' });
  });

  y += 24;

  // ── Bubble Heatmap ──
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text('Trainingszeiten', MARGIN, y);
  y += 5;

  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const bubbles = bubbleHeatmapData(checkins);
  const allSlots = [...new Set(bubbles.map(b => b.slot))].sort();
  const maxCount = Math.max(1, ...bubbles.map(b => b.count));

  const colW = (CONTENT_W - 16) / Math.max(allSlots.length, 1);
  const rowH = 8;

  // Slot headers
  doc.setFontSize(6);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  allSlots.forEach((slot, i) => {
    doc.text(slot, MARGIN + 16 + i * colW + colW / 2, y, { align: 'center' });
  });
  y += 3;

  // Day rows
  const bubbleMap = new Map(bubbles.map(b => [`${b.day}|${b.slot}`, b.count]));
  days.forEach((day, di) => {
    const rowY = y + di * rowH + rowH / 2;
    doc.setFontSize(7);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(day, MARGIN + 10, rowY + 1, { align: 'right' });

    allSlots.forEach((slot, si) => {
      const count = bubbleMap.get(`${day}|${slot}`) || 0;
      if (count > 0) {
        const intensity = Math.min(count / maxCount, 1);
        const r = Math.round(BLUE[0] + (BLUE_LIGHT[0] - BLUE[0]) * (1 - intensity));
        const g = Math.round(BLUE[1] + (BLUE_LIGHT[1] - BLUE[1]) * (1 - intensity));
        const b = Math.round(BLUE[2] + (BLUE_LIGHT[2] - BLUE[2]) * (1 - intensity));
        doc.setFillColor(r, g, b);
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
  doc.setTextColor(...DARK);
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
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(x, y, recW, 18, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${rc.emoji} ${rc.label}`, x + 3, y + 5);
    doc.setFontSize(11);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(rc.value, x + 3, y + 12);
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(rc.sub, x + 3, y + 16);
  });

  y += 26;

  // ── Page 2: Tables ──
  const tableStyles = {
    headStyles: { fillColor: BLUE as any, textColor: WHITE as any, fontStyle: 'bold' as const, fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: DARK as any },
    alternateRowStyles: { fillColor: [245, 247, 250] as any },
    styles: { cellPadding: 1.5 },
    margin: { left: MARGIN, right: MARGIN },
  };

  // Check if we need a new page
  if (y > 200) {
    doc.addPage();
    y = 16;
  }

  // Weekly visits table
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text('Besuche pro Woche', MARGIN, y);
  y += 2;

  const weekly = weeklyVisits(checkins);
  const weeklyRows = weekly.map(w => [w.week, String(w.visits), '▮'.repeat(Math.min(w.visits, 20))]);
  autoTable(doc, {
    startY: y,
    head: [['Woche', 'Besuche', '']],
    body: weeklyRows.slice(-20), // last 20 weeks
    ...tableStyles,
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Weekday distribution
  if (y > 240) { doc.addPage(); y = 16; }
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
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
  if (y > 240) { doc.addPage(); y = 16; }
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
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
  if (y > 240) { doc.addPage(); y = 16; }
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
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

  // ── Footer ──
  addFooter(doc);

  doc.save(`training-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
