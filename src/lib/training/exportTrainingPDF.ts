import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { TrainingCheckin } from './types';

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

function getThemeBg(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [20, 20, 20] : [252, 252, 252];
}

function getAccent(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [63, 187, 126] : [47, 155, 110];
}

function getFg(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [235, 235, 235] : [31, 31, 31];
}

function getMuted(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [160, 160, 160] : [140, 140, 140];
}

function getWhite(): [number, number, number] {
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? [235, 235, 235] : [255, 255, 255];
}

function fillPageBg(doc: jsPDF) {
  const bg = getThemeBg();
  doc.setFillColor(...bg);
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

export async function exportTrainingPDF(
  checkins: TrainingCheckin[],
  sectionImages?: { label: string; dataUrl: string }[],
) {
  const accent = getAccent();
  const fg = getFg();
  const muted = getMuted();
  const white = getWhite();

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // ── First page background ──
  fillPageBg(doc);

  // ── Header bar ──
  doc.setFillColor(...accent);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setTextColor(...white);
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

  let y = 28;

  // ── Embed all section screenshots ──
  if (sectionImages && sectionImages.length > 0) {
    const maxImgH = PAGE_H - 2 * MARGIN - 16;
    const SECTION_GAP = 10;
    const FOOTER_RESERVE = 16;
    const PAGE_BREAK_THRESHOLD = 60;

    for (let idx = 0; idx < sectionImages.length; idx++) {
      const img = sectionImages[idx];
      const ratio = await getImageAspectRatio(img.dataUrl);
      let imgW = CONTENT_W;
      let imgH = imgW / ratio;

      // Scale down if taller than a full page
      if (imgH > maxImgH) {
        imgH = maxImgH;
        imgW = imgH * ratio;
      }

      // Need new page if image doesn't fit OR remaining space is too tight
      const needsNewPage = y + imgH + SECTION_GAP > PAGE_H - FOOTER_RESERVE;
      if (needsNewPage) {
        doc.addPage();
        fillPageBg(doc);
        y = MARGIN;
      }

      // Center horizontally if scaled down
      const xOffset = MARGIN + (CONTENT_W - imgW) / 2;
      doc.addImage(img.dataUrl, 'JPEG', xOffset, y, imgW, imgH);
      y += imgH + SECTION_GAP;

      // Proactive page break: if less than threshold remains, next section goes to new page
      if (PAGE_H - y - FOOTER_RESERVE < PAGE_BREAK_THRESHOLD && idx < sectionImages.length - 1) {
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

  doc.save(`training-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
