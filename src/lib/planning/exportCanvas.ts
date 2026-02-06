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
 * Exports the planning view as a high-quality 1:1 screenshot (PNG) or as a PDF containing that screenshot.
 *
 * Design goal: the export must look like what the user sees on screen.
 *
 * Implementation notes:
 * - Uses `html-to-image` (foreignObject-based) which is typically closer to 1:1 than html2canvas for modern CSS.
 * - Clones the node to avoid flicker / layout jumps.
 * - Flattens Radix ScrollArea viewports so offscreen content is included.
 * - Resolves CSS variables into explicit computed values for consistent capture.
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

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.backgroundColor = '#ffffff';
  clone.style.overflow = 'visible';

  // Ensure deterministic export (no animations)
  clone.querySelectorAll('.animate-pulse').forEach((el) => {
    (el as HTMLElement).classList.remove('animate-pulse');
  });

  // If the UI uses Radix ScrollArea, flatten it so exports include the real content.
  // (Otherwise we'd export only the visible viewport.)
  clone.querySelectorAll('[data-radix-scroll-area-viewport]').forEach((el) => {
    const viewport = el as HTMLElement;
    viewport.style.overflow = 'visible';
    viewport.style.height = 'auto';
    viewport.style.maxHeight = 'none';
  });

  document.body.appendChild(clone);

  // Wait for fonts to be ready (prevents "fallback font" exports)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fonts = (document as any).fonts;
  if (fonts?.ready) {
    await fonts.ready;
  }

  // Fix CSS variables that capture engines cannot always resolve
  fixCSSVariablesForExport(clone);

  const rect = element.getBoundingClientRect();
  const exportWidth = Math.max(Math.ceil(rect.width), clone.scrollWidth);
  const exportHeight = Math.max(Math.ceil(rect.height), clone.scrollHeight);

  const dataUrl = await toPng(clone, {
    cacheBust: true,
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    width: exportWidth,
    height: exportHeight,
  });

  document.body.removeChild(clone);

  const canvas = await dataUrlToCanvas(dataUrl);

  if (format === 'png') {
    downloadPNGFromDataUrl(dataUrl, filename);
  } else {
    downloadPDFFromCanvas(canvas, filename, periodLabel);
  }
}

/**
 * Replace CSS variables with explicit colors for html2canvas compatibility
 */
function fixCSSVariablesForExport(element: HTMLElement): void {
  const allElements = element.querySelectorAll('*');
  
  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      const computedStyle = window.getComputedStyle(el);
      
      // Fix background colors that use CSS variables
      const bgColor = computedStyle.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
        el.style.backgroundColor = bgColor;
      }
      
      // Fix text colors
      const color = computedStyle.color;
      if (color) {
        el.style.color = color;
      }
      
      // Fix border colors
      const borderColor = computedStyle.borderColor;
      if (borderColor) {
        el.style.borderColor = borderColor;
      }
      
      // Ensure overflow visible for labels
      if (el.classList.contains('overflow-visible')) {
        el.style.overflow = 'visible';
      }
    }
  });
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
