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
 * Uses clone strategy with explicit colors for reliable html2canvas capture
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

  // Clone the element for clean capture without affecting the DOM
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.backgroundColor = '#ffffff';
  clone.style.overflow = 'visible';
  
  // Remove any animations for static export
  clone.querySelectorAll('.animate-pulse').forEach(el => {
    (el as HTMLElement).classList.remove('animate-pulse');
  });
  
  document.body.appendChild(clone);

  // Fix CSS variables that html2canvas cannot resolve
  fixCSSVariablesForExport(clone);

  // Capture at 2x scale for retina quality
  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: clone.scrollWidth + 200, // Extra padding for labels
    windowHeight: clone.scrollHeight + 200,
  });

  // Cleanup clone
  document.body.removeChild(clone);

  if (format === 'png') {
    downloadPNG(canvas, filename);
  } else {
    downloadPDF(canvas, filename, periodLabel);
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

function downloadPNG(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL('image/png', 1.0);
  link.click();
}

function downloadPDF(canvas: HTMLCanvasElement, filename: string, periodLabel: string): void {
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
