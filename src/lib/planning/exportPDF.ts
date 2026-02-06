import jsPDF from 'jspdf';
import { format, differenceInDays, isBefore, isAfter } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  Client, 
  MilestoneWithClient, 
  ViewMode, 
  Quarter, 
  HalfYear,
  getQuarterDateRange,
  getHalfYearDateRange,
  getQuarterLabel,
  getHalfYearLabel,
  MILESTONE_TYPE_CONFIG,
  MilestoneType
} from './types';

interface ExportData {
  viewMode: ViewMode;
  quarter?: Quarter;
  halfYear?: HalfYear;
  clientData: Array<{
    client: Client;
    milestones: MilestoneWithClient[];
  }>;
}

export function exportPlanningPDF(data: ExportData): void {
  const isHalfYear = data.viewMode === 'halfyear';
  const isLandscape = isHalfYear;
  
  const doc = new jsPDF({
    orientation: isLandscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = isLandscape ? 297 : 210;
  const pageHeight = isLandscape ? 210 : 297;
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Get view range and label
  const viewRange = isHalfYear 
    ? getHalfYearDateRange(data.halfYear!)
    : getQuarterDateRange(data.quarter!);
  
  const periodLabel = isHalfYear 
    ? getHalfYearLabel(data.halfYear!)
    : getQuarterLabel(data.quarter!);

  // Months for columns
  const monthCount = isHalfYear ? 6 : 3;
  const months: Date[] = [];
  for (let i = 0; i < monthCount; i++) {
    months.push(new Date(viewRange.start.getFullYear(), viewRange.start.getMonth() + i, 1));
  }

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PROJEKTPLANUNG', margin, margin + 8);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(periodLabel, margin, margin + 16);
  
  doc.setFontSize(9);
  doc.setTextColor(128);
  doc.text(`Generiert: ${format(new Date(), 'd. MMMM yyyy', { locale: de })}`, pageWidth - margin, margin + 8, { align: 'right' });
  doc.setTextColor(0);

  // Timeline area setup
  const headerY = margin + 25;
  const clientColumnWidth = 35;
  const timelineWidth = contentWidth - clientColumnWidth;
  const monthWidth = timelineWidth / monthCount;
  const rowHeight = 18;
  const startY = headerY + 10;

  // Draw month headers
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  months.forEach((month, i) => {
    const x = margin + clientColumnWidth + (i * monthWidth) + (monthWidth / 2);
    doc.text(format(month, 'MMMM', { locale: de }), x, headerY, { align: 'center' });
  });

  // Draw vertical grid lines
  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  for (let i = 0; i <= monthCount; i++) {
    const x = margin + clientColumnWidth + (i * monthWidth);
    doc.line(x, headerY + 3, x, startY + (data.clientData.length * rowHeight));
  }

  // Draw client rows
  const totalDays = differenceInDays(viewRange.end, viewRange.start) + 1;

  data.clientData.forEach(({ client, milestones }, index) => {
    const y = startY + (index * rowHeight);
    
    // Client name
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text(client.name, margin, y + 6, { maxWidth: clientColumnWidth - 3 });

    // Draw colored indicator
    const hexColor = client.color.replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16);
    const g = parseInt(hexColor.substring(2, 4), 16);
    const b = parseInt(hexColor.substring(4, 6), 16);
    doc.setFillColor(r, g, b);
    doc.rect(margin - 3, y, 2, rowHeight - 2, 'F');

    // Draw period bar if client has dates
    if (client.start_date && client.end_date) {
      const clientStart = new Date(client.start_date);
      const clientEnd = new Date(client.end_date);
      
      const visibleStart = isBefore(clientStart, viewRange.start) ? viewRange.start : clientStart;
      const visibleEnd = isAfter(clientEnd, viewRange.end) ? viewRange.end : clientEnd;
      
      if (!isAfter(clientStart, viewRange.end) && !isBefore(clientEnd, viewRange.start)) {
        const leftDays = differenceInDays(visibleStart, viewRange.start);
        const widthDays = differenceInDays(visibleEnd, visibleStart) + 1;
        
        const barX = margin + clientColumnWidth + (leftDays / totalDays) * timelineWidth;
        const barWidth = (widthDays / totalDays) * timelineWidth;
        
        // Draw bar background
        doc.setFillColor(r, g, b, 0.2);
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.5);
        doc.roundedRect(barX, y + 2, barWidth, rowHeight - 6, 2, 2, 'FD');
      }
    }

    // Draw milestone markers
    milestones.forEach(milestone => {
      const mDate = new Date(milestone.date);
      if (isBefore(mDate, viewRange.start) || isAfter(mDate, viewRange.end)) return;
      
      const daysFromStart = differenceInDays(mDate, viewRange.start);
      const mX = margin + clientColumnWidth + (daysFromStart / totalDays) * timelineWidth;
      
      const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType];
      const colorStr = config?.color || client.color;
      
      // Parse HSL color to RGB for PDF
      const [mr, mg, mb] = hslToRgb(colorStr);
      doc.setFillColor(mr, mg, mb);
      doc.circle(mX, y + rowHeight / 2, 2, 'F');
      
      // Add tiny label
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80);
      doc.text(format(mDate, 'd.M'), mX, y + rowHeight - 2, { align: 'center' });
    });

    // Draw row separator
    doc.setDrawColor(230);
    doc.setLineWidth(0.1);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
  });

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('habitbattle.lovable.app', pageWidth / 2, footerY, { align: 'center' });

  // Download
  const filename = `projektplanung-${periodLabel.toLowerCase().replace(' ', '-')}.pdf`;
  doc.save(filename);
}

// Helper to convert HSL color string to RGB
function hslToRgb(hslStr: string): [number, number, number] {
  // Parse "hsl(217, 91%, 60%)" format
  const match = hslStr.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return [100, 100, 100]; // fallback gray
  
  const h = parseInt(match[1]) / 360;
  const s = parseInt(match[2]) / 100;
  const l = parseInt(match[3]) / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
