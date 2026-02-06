import html2canvas from 'html2canvas';
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
 * Captures the planning view as a high-quality image and exports as PNG or PDF
 */
export async function exportPlanningCanvas({
  elementId,
  format,
  filename,
  periodLabel,
}: ExportOptions): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Capture at 2x scale for retina quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
      ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--background').trim()})`
      : '#ffffff',
    logging: false,
    // Ensure scrollable content is fully captured
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  if (format === 'png') {
    downloadPNG(canvas, filename);
  } else {
    downloadPDF(canvas, filename, periodLabel);
  }
}

function downloadPNG(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

function downloadPDF(canvas: HTMLCanvasElement, filename: string, periodLabel: string): void {
  const imgData = canvas.toDataURL('image/png', 1.0);
  
  // Determine orientation based on aspect ratio
  const aspectRatio = canvas.width / canvas.height;
  const isLandscape = aspectRatio > 1;
  
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 10;
  const headerHeight = 20;
  const footerHeight = 10;
  
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - headerHeight - footerHeight - 2 * margin;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Projektplanung', margin, margin + 8);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(periodLabel, margin + 70, margin + 8);
  
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const dateStr = format(new Date(), 'd. MMMM yyyy', { locale: de });
  doc.text(dateStr, pageWidth - margin, margin + 8, { align: 'right' });

  // Separator line
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, headerHeight, pageWidth - margin, headerHeight);

  // Calculate image dimensions to fit content area while maintaining aspect ratio
  const imgWidth = canvas.width / 2; // Because we captured at 2x
  const imgHeight = canvas.height / 2;
  const imgAspect = imgWidth / imgHeight;
  const contentAspect = contentWidth / contentHeight;

  let finalWidth: number;
  let finalHeight: number;

  if (imgAspect > contentAspect) {
    // Image is wider than content area
    finalWidth = contentWidth;
    finalHeight = contentWidth / imgAspect;
  } else {
    // Image is taller than content area
    finalHeight = contentHeight;
    finalWidth = contentHeight * imgAspect;
  }

  const x = margin + (contentWidth - finalWidth) / 2;
  const y = headerHeight + margin;

  doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

  // Footer
  doc.setFontSize(7);
  doc.setTextColor(180, 180, 180);
  doc.text('habitbattle.lovable.app', pageWidth / 2, pageHeight - 5, { align: 'center' });

  doc.save(`${filename}.pdf`);
}

/**
 * Generates a clean filename from period label
 */
export function generateFilename(periodLabel: string): string {
  return `projektplanung-${periodLabel.toLowerCase().replace(/\s+/g, '-')}`;
}
