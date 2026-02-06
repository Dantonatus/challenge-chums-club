import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export type ExportFormat = 'png' | 'pdf';

interface ExportOptions {
  elementId: string;
  format: ExportFormat;
  filename: string;
  periodLabel: string;
}

/**
 * Exports the planning view as a high-quality screenshot (PNG) or PDF.
 * 
 * Key features:
 * - Works directly on the original element (no offscreen clone issues)
 * - Temporarily expands ScrollAreas to include all content
 * - Theme-aware: exports exactly what's on screen (light/dark mode)
 * - Retina quality (2x pixel ratio)
 */
export async function exportPlanningCanvas({
  elementId,
  format,
  filename,
  periodLabel,
}: ExportOptions): Promise<void> {
  // Try export wrapper first (includes padding for label overflow), then fall back to chart
  const wrapperElement = document.getElementById(`${elementId}-export-wrapper`);
  const element = wrapperElement || document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Wait for fonts to be ready
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Temporarily expand ScrollAreas to include all content
  const scrollAreas = element.querySelectorAll('[data-radix-scroll-area-viewport]');
  const originalStyles = new Map<HTMLElement, { overflow: string; height: string; maxHeight: string }>();

  scrollAreas.forEach((el) => {
    const viewport = el as HTMLElement;
    originalStyles.set(viewport, {
      overflow: viewport.style.overflow,
      height: viewport.style.height,
      maxHeight: viewport.style.maxHeight,
    });
    viewport.style.overflow = 'visible';
    viewport.style.height = 'auto';
    viewport.style.maxHeight = 'none';
  });

  // Wait for layout recalculation
  await new Promise<void>(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  try {
    // Export directly on original element - html-to-image handles cloning internally
    const dataUrl = await toPng(element, {
      cacheBust: true,
      pixelRatio: 2, // Retina quality
      // No backgroundColor - captures exactly what's on screen (theme-aware)
      style: {
        // Disable animations for static export
        animation: 'none',
        transition: 'none',
      },
      filter: (node) => {
        // Filter out pulsing animation elements (today indicator dot)
        if (node instanceof HTMLElement) {
          if (node.classList.contains('animate-pulse')) {
            return false;
          }
        }
        return true;
      },
    });

    if (format === 'png') {
      downloadPNGFromDataUrl(dataUrl, filename);
    } else {
      const canvas = await dataUrlToCanvas(dataUrl);
      downloadPDFFromCanvas(canvas, filename, periodLabel);
    }
  } finally {
    // Restore original ScrollArea styles
    originalStyles.forEach((styles, el) => {
      el.style.overflow = styles.overflow;
      el.style.height = styles.height;
      el.style.maxHeight = styles.maxHeight;
    });
  }
}

async function dataUrlToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.decoding = 'async';
  img.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load export image'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Unable to create canvas context');
  ctx.drawImage(img, 0, 0);

  return canvas;
}

function downloadPNGFromDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

function downloadPDFFromCanvas(canvas: HTMLCanvasElement, filename: string, periodLabel: string): void {
  const imgData = canvas.toDataURL('image/png', 1.0);

  // Always use landscape for Gantt charts
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 5;
  const headerHeight = 12;
  const footerHeight = 6;

  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - headerHeight - footerHeight - margin;

  // Minimalist header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Projektplanung', margin, margin + 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(periodLabel, margin + 55, margin + 6);

  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const dateStr = format(new Date(), 'd.MM.yyyy', { locale: de });
  doc.text(dateStr, pageWidth - margin, margin + 6, { align: 'right' });

  // Subtle separator line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, headerHeight - 2, pageWidth - margin, headerHeight - 2);

  // Calculate image dimensions to fit content area while maintaining aspect ratio
  const imgWidth = canvas.width / 2; // Because we captured at 2x
  const imgHeight = canvas.height / 2;
  const imgAspect = imgWidth / imgHeight;

  let finalWidth = contentWidth;
  let finalHeight = finalWidth / imgAspect;

  if (finalHeight > contentHeight) {
    finalHeight = contentHeight;
    finalWidth = finalHeight * imgAspect;
  }

  const x = margin + (contentWidth - finalWidth) / 2;
  const y = headerHeight;

  doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

  // Subtle footer
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text('habitbattle.lovable.app', pageWidth / 2, pageHeight - 4, { align: 'center' });

  doc.save(`${filename}.pdf`);
}

/**
 * Generates a clean filename from period label
 */
export function generateFilename(periodLabel: string): string {
  return `projektplanung-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`;
}
