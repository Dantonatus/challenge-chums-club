import jsPDF from 'jspdf';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import type { BodyScan } from './types';

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

export async function exportBodyScanPDF(
  scans: BodyScan[],
  sectionImages?: { label: string; dataUrl: string }[],
) {
  const accent = getAccent();
  const muted = getMuted();
  const white = getWhite();
  const fg = getFg();

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

  let y = 28;

  // ── Embed screenshot sections ──
  if (sectionImages && sectionImages.length > 0) {
    const maxImgH = PAGE_H - MARGIN - 16;
    const SECTION_GAP = 6;
    const FOOTER_RESERVE = 14;
    const TITLE_H = 8;

    for (let idx = 0; idx < sectionImages.length; idx++) {
      const img = sectionImages[idx];
      const ratio = await getImageAspectRatio(img.dataUrl);
      let imgW = CONTENT_W;
      let imgH = imgW / ratio;

      if (imgH > maxImgH - TITLE_H) {
        imgH = maxImgH - TITLE_H;
        imgW = imgH * ratio;
      }

      const totalBlockH = TITLE_H + imgH;
      const needsNewPage = y + totalBlockH > PAGE_H - FOOTER_RESERVE;
      if (needsNewPage) {
        doc.addPage();
        fillPageBg(doc);
        y = MARGIN;
      }

      // Section title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...fg);
      doc.text(img.label, MARGIN, y + 5);

      // Accent underline
      doc.setDrawColor(...accent);
      doc.setLineWidth(0.6);
      doc.line(MARGIN, y + 7, MARGIN + doc.getTextWidth(img.label), y + 7);

      y += TITLE_H;

      // Image — no extra frame, the UI cards already have their own styling
      const xOffset = MARGIN + (CONTENT_W - imgW) / 2;
      doc.addImage(img.dataUrl, 'PNG', xOffset, y, imgW, imgH);

      y += imgH + SECTION_GAP;

      // Page break if remaining space too small
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
