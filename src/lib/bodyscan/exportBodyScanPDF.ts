import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { BodyScan, BodyScanSegments } from './types';
import { trendDiff, formatTrend } from './analytics';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

function getThemeBg(): [number, number, number] {
  return isDarkMode() ? [20, 20, 20] : [252, 252, 252];
}

function getAccent(): [number, number, number] {
  return isDarkMode() ? [63, 187, 126] : [47, 155, 110];
}

function getFg(): [number, number, number] {
  return isDarkMode() ? [235, 235, 235] : [31, 31, 31];
}

function getMuted(): [number, number, number] {
  return isDarkMode() ? [160, 160, 160] : [120, 120, 120];
}

function getWhite(): [number, number, number] {
  return isDarkMode() ? [235, 235, 235] : [255, 255, 255];
}

function getCardBg(): [number, number, number] {
  return isDarkMode() ? [30, 30, 30] : [255, 255, 255];
}

function getBorder(): [number, number, number] {
  return isDarkMode() ? [55, 55, 55] : [225, 225, 225];
}

function getSubtleBg(): [number, number, number] {
  return isDarkMode() ? [28, 28, 28] : [248, 248, 248];
}

function fillPageBg(doc: jsPDF) {
  doc.setFillColor(...getThemeBg());
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
}

function getImageAspectRatio(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img.width / img.height);
    img.onerror = () => resolve(16 / 9);
    img.src = dataUrl;
  });
}

/* ── Vector-rendered KPI summary table ── */
function drawKPISummary(
  doc: jsPDF,
  scan: BodyScan,
  scans: BodyScan[],
  startY: number,
): number {
  const fg = getFg();
  const muted = getMuted();
  const accent = getAccent();
  const cardBg = getCardBg();
  const border = getBorder();
  const subtleBg = getSubtleBg();

  let y = startY;

  // Section title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...fg);
  doc.text(`Scan vom ${format(parseISO(scan.scan_date), 'dd. MMMM yyyy', { locale: de })}`, MARGIN, y);
  y += 2;

  if (scan.device) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(`Gerät: ${scan.device}`, MARGIN, y + 4);
    y += 6;
  }

  y += 4;

  // Build KPI rows
  const fatFreeMass = scan.weight_kg != null && scan.fat_mass_kg != null
    ? +(scan.weight_kg - scan.fat_mass_kg).toFixed(1)
    : null;

  const kpis: { label: string; value: string; trend?: string }[] = [
    { label: 'Gewicht', value: scan.weight_kg != null ? `${scan.weight_kg} kg` : '–', trend: formatTrend(trendDiff(scans, 'weight_kg', true), ' kg vs. Start') },
    { label: 'Körperfett', value: scan.fat_percent != null ? `${scan.fat_percent} %` : '–', trend: formatTrend(trendDiff(scans, 'fat_percent'), ' % vs. vorher') },
    { label: 'Fettmasse', value: scan.fat_mass_kg != null ? `${scan.fat_mass_kg} kg` : '–', trend: formatTrend(trendDiff(scans, 'fat_mass_kg'), ' kg vs. vorher') },
    { label: 'Fettfreie Masse', value: fatFreeMass != null ? `${fatFreeMass} kg` : '–' },
    { label: 'Muskelmasse', value: scan.muscle_mass_kg != null ? `${scan.muscle_mass_kg} kg` : '–', trend: formatTrend(trendDiff(scans, 'muscle_mass_kg'), ' kg vs. vorher') },
    { label: 'Skelettmuskulatur', value: scan.skeletal_muscle_mass_kg != null ? `${scan.skeletal_muscle_mass_kg} kg` : '–' },
    { label: 'Viszeralfett', value: scan.visceral_fat != null ? `${scan.visceral_fat}` : '–', trend: scan.visceral_fat != null ? (scan.visceral_fat <= 12 ? 'Gesund' : 'Erhöht') : undefined },
    { label: 'BMI', value: scan.bmi != null ? `${scan.bmi}` : '–', trend: scan.bmi != null ? (scan.bmi < 18.5 ? 'Untergewicht' : scan.bmi < 25 ? 'Normalgewicht' : scan.bmi < 30 ? 'Übergewicht' : 'Adipositas') : undefined },
    { label: 'Metabolisches Alter', value: scan.metabolic_age != null ? `${scan.metabolic_age} J.` : '–', trend: scan.age_years != null ? `Echtes Alter: ${scan.age_years} J.` : undefined },
    { label: 'Grundumsatz (BMR)', value: scan.bmr_kcal != null ? `${scan.bmr_kcal} kcal` : '–', trend: formatTrend(trendDiff(scans, 'bmr_kcal'), ' kcal vs. vorher') },
    { label: 'Knochenmasse', value: scan.bone_mass_kg != null ? `${scan.bone_mass_kg} kg` : '–' },
    { label: 'Körperwasser', value: scan.tbw_percent != null ? `${scan.tbw_percent} %` : (scan.tbw_kg != null ? `${scan.tbw_kg} kg` : '–') },
  ].filter(k => k.value !== '–');

  // Table dimensions
  const ROW_H = 7;
  const COL_LABEL = 55;
  const COL_VALUE = 35;
  const COL_TREND = CONTENT_W - COL_LABEL - COL_VALUE;
  const TABLE_H = (kpis.length + 1) * ROW_H;

  // Table background card
  doc.setFillColor(...cardBg);
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CONTENT_W, TABLE_H + 2, 2, 2, 'FD');

  // Header row
  doc.setFillColor(...subtleBg);
  doc.roundedRect(MARGIN + 0.5, y + 0.5, CONTENT_W - 1, ROW_H, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...muted);
  doc.text('Kennzahl', MARGIN + 4, y + 5);
  doc.text('Wert', MARGIN + COL_LABEL + 4, y + 5);
  doc.text('Veränderung', MARGIN + COL_LABEL + COL_VALUE + 4, y + 5);
  y += ROW_H;

  // Data rows
  for (let i = 0; i < kpis.length; i++) {
    const kpi = kpis[i];
    const rowY = y + i * ROW_H;

    // Alternating row bg
    if (i % 2 === 1) {
      doc.setFillColor(...subtleBg);
      doc.rect(MARGIN + 0.5, rowY, CONTENT_W - 1, ROW_H, 'F');
    }

    // Separator line
    doc.setDrawColor(...border);
    doc.setLineWidth(0.15);
    doc.line(MARGIN + 2, rowY, MARGIN + CONTENT_W - 2, rowY);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...fg);
    doc.text(kpi.label, MARGIN + 4, rowY + 5);

    // Value (bold, accent)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text(kpi.value, MARGIN + COL_LABEL + 4, rowY + 5);

    // Trend
    if (kpi.trend) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...muted);
      doc.text(kpi.trend, MARGIN + COL_LABEL + COL_VALUE + 4, rowY + 5);
    }
  }

  y += kpis.length * ROW_H + 6;

  // ── Segment table ──
  const segments = scan.segments_json as BodyScanSegments | null;
  if (segments) {
    const hasMuscleSeg = segments.muscle && Object.values(segments.muscle).some(v => v > 0);
    const hasFatSeg = segments.fat && Object.values(segments.fat).some(v => v > 0);

    if (hasMuscleSeg || hasFatSeg) {
      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...fg);
      doc.text('Segment-Übersicht', MARGIN, y);
      y += 5;

      const segLabels: { key: string; label: string }[] = [
        { key: 'trunk', label: 'Rumpf' },
        { key: 'armR', label: 'Arm rechts' },
        { key: 'armL', label: 'Arm links' },
        { key: 'legR', label: 'Bein rechts' },
        { key: 'legL', label: 'Bein links' },
      ];

      const cols = ['Segment'];
      if (hasMuscleSeg) cols.push('Muskel (kg)');
      if (hasFatSeg) cols.push('Fett (%)');
      const colW = (CONTENT_W - 1) / cols.length;
      const SEG_ROW_H = 7;
      const SEG_TABLE_H = (segLabels.length + 1) * SEG_ROW_H;

      doc.setFillColor(...cardBg);
      doc.setDrawColor(...border);
      doc.setLineWidth(0.3);
      doc.roundedRect(MARGIN, y, CONTENT_W, SEG_TABLE_H + 2, 2, 2, 'FD');

      // Header
      doc.setFillColor(...subtleBg);
      doc.roundedRect(MARGIN + 0.5, y + 0.5, CONTENT_W - 1, SEG_ROW_H, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...muted);
      cols.forEach((col, ci) => {
        doc.text(col, MARGIN + 4 + ci * colW, y + 5);
      });
      y += SEG_ROW_H;

      for (let i = 0; i < segLabels.length; i++) {
        const seg = segLabels[i];
        const rowY = y + i * SEG_ROW_H;

        if (i % 2 === 1) {
          doc.setFillColor(...subtleBg);
          doc.rect(MARGIN + 0.5, rowY, CONTENT_W - 1, SEG_ROW_H, 'F');
        }

        doc.setDrawColor(...border);
        doc.setLineWidth(0.15);
        doc.line(MARGIN + 2, rowY, MARGIN + CONTENT_W - 2, rowY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(...fg);
        doc.text(seg.label, MARGIN + 4, rowY + 5);

        let colIdx = 1;
        if (hasMuscleSeg) {
          const val = segments.muscle?.[seg.key as keyof typeof segments.muscle];
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(...accent);
          doc.text(val != null ? `${val}` : '–', MARGIN + 4 + colIdx * colW, rowY + 5);
          colIdx++;
        }
        if (hasFatSeg) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(...accent);
          const val = segments.fat?.[seg.key as keyof typeof segments.fat];
          doc.text(val != null ? `${val}` : '–', MARGIN + 4 + colIdx * colW, rowY + 5);
        }
      }

      y += segLabels.length * SEG_ROW_H + 4;
    }
  }

  return y;
}

export async function exportBodyScanPDF(
  scans: BodyScan[],
  sectionImages?: { label: string; dataUrl: string }[],
) {
  const accent = getAccent();
  const muted = getMuted();
  const white = getWhite();
  const fg = getFg();
  const border = getBorder();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ── First page ──
  fillPageBg(doc);

  // Header bar
  doc.setFillColor(...accent);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(...white);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Body Scan Bericht', MARGIN, 13);

  const sorted = [...scans].sort((a, b) => a.scan_date.localeCompare(b.scan_date));
  if (sorted.length > 0) {
    const from = format(parseISO(sorted[0].scan_date), 'dd. MMM yyyy', { locale: de });
    const to = format(parseISO(sorted[sorted.length - 1].scan_date), 'dd. MMM yyyy', { locale: de });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${from} – ${to}`, PAGE_W - MARGIN, 13, { align: 'right' });
  }

  let y = 30;

  // ── Vector KPI Summary for latest scan ──
  const latestScan = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  if (latestScan) {
    y = drawKPISummary(doc, latestScan, scans, y);
    y += 6;
  }

  // ── Embed chart screenshots ──
  if (sectionImages && sectionImages.length > 0) {
    const maxImgH = PAGE_H - MARGIN - 16;
    const SECTION_GAP = 8;
    const FOOTER_RESERVE = 14;
    const TITLE_H = 8;

    for (let idx = 0; idx < sectionImages.length; idx++) {
      const img = sectionImages[idx];
      const ratio = await getImageAspectRatio(img.dataUrl);
      let imgW = CONTENT_W - 2; // slightly inset for frame
      let imgH = imgW / ratio;

      if (imgH > maxImgH - TITLE_H) {
        imgH = maxImgH - TITLE_H;
        imgW = imgH * ratio;
      }

      const totalBlockH = TITLE_H + imgH + 4; // title + image + padding
      const needsNewPage = y + totalBlockH > PAGE_H - FOOTER_RESERVE;
      if (needsNewPage) {
        doc.addPage();
        fillPageBg(doc);
        y = MARGIN;
      }

      // Section title (vector text)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...fg);
      doc.text(img.label, MARGIN, y + 5);

      // Thin accent underline
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.6);
      doc.line(MARGIN, y + 7, MARGIN + doc.getTextWidth(img.label), y + 7);

      y += TITLE_H;

      // Subtle frame around chart image
      const frameX = MARGIN;
      const frameY = y;
      const frameW = CONTENT_W;
      const frameH = imgH + 2;

      doc.setDrawColor(...border);
      doc.setLineWidth(0.3);
      doc.roundedRect(frameX, frameY, frameW, frameH, 1.5, 1.5, 'S');

      // Chart image centered inside frame
      const xOffset = frameX + (frameW - imgW) / 2;
      doc.addImage(img.dataUrl, 'PNG', xOffset, frameY + 1, imgW, imgH);

      y += frameH + SECTION_GAP;

      // Page break if remaining space too small for next section
      if (PAGE_H - y - FOOTER_RESERVE < 50 && idx < sectionImages.length - 1) {
        doc.addPage();
        fillPageBg(doc);
        y = MARGIN;
      }
    }
  }

  // ── Footer on all pages ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...muted);
    doc.text(`Erstellt am ${format(new Date(), 'dd.MM.yyyy, HH:mm')} Uhr`, MARGIN, PAGE_H - 7);
    doc.text(`Seite ${i} / ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 7, { align: 'right' });
  }

  doc.save(`bodyscan-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
