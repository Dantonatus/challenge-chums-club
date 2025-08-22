import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface CSVExportData {
  Week: string;
  Challenge: string;
  Participant: string;
  Fails: number;
  Penalties: string; // Formatted as currency
}

interface ExportOptions {
  start: Date;
  end: Date;
  filters: {
    participants?: string[];
    challengeTypes?: string[];
    groups?: string[];
  };
  lang: 'de' | 'en';
}

/**
 * Generate CSV data from weekly aggregations
 */
export async function generateCSVData(options: ExportOptions): Promise<CSVExportData[]> {
  const { start, end, filters, lang } = options;
  const locale = lang === 'de' ? de : enUS;
  
  const startStr = format(start, 'yyyy-MM-dd');
  const endStr = format(end, 'yyyy-MM-dd');

  // Get user's groups
  const { data: userGroups } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id);

  if (!userGroups?.length) return [];

  const groupIds = userGroups.map(g => g.group_id);

  // Get challenges in date range
  const { data: challenges } = await supabase
    .from('challenges')
    .select(`
      id,
      title,
      challenge_type,
      start_date,
      end_date,
      penalty_cents
    `)
    .in('group_id', groupIds)
    .lte('start_date', endStr)
    .gte('end_date', startStr);

  if (!challenges?.length) return [];

  const challengeIds = challenges.map(c => c.id);

  // Get participants with profiles
  const { data: participants } = await supabase
    .from('challenge_participants')
    .select(`
      challenge_id,
      user_id,
      profiles!inner(display_name)
    `)
    .in('challenge_id', challengeIds);

  // Get violations
  const { data: violations } = await supabase
    .from('challenge_violations')
    .select('challenge_id, user_id, created_at, amount_cents')
    .in('challenge_id', challengeIds)
    .gte('created_at', `${startStr}T00:00:00`)
    .lte('created_at', `${endStr}T23:59:59`);

  // Generate weeks in range
  const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
  
  const csvData: CSVExportData[] = [];

  // For each week
  weeks.forEach(week => {
    const weekStart = startOfWeek(week, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(week, { weekStartsOn: 1 });
    const weekNumber = getWeek(week, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    const weekLabel = lang === 'de' ? `KW ${weekNumber}` : `Week ${weekNumber}`;

    // For each challenge
    challenges.forEach(challenge => {
      const challengeParticipants = participants?.filter(p => p.challenge_id === challenge.id) || [];
      
      // For each participant
      challengeParticipants.forEach(participant => {
        const profile = participant.profiles as any;
        if (!profile?.display_name) return;

        // Apply participant filter
        if (filters.participants?.length && !filters.participants.includes(profile.display_name)) {
          return;
        }

        // Apply challenge type filter
        if (filters.challengeTypes?.length && !filters.challengeTypes.includes(challenge.challenge_type)) {
          return;
        }

        // Count fails for this participant in this week for this challenge
        const weekViolations = violations?.filter(v => 
          v.challenge_id === challenge.id &&
          v.user_id === participant.user_id &&
          new Date(v.created_at) >= weekStart &&
          new Date(v.created_at) <= weekEnd
        ) || [];

        const failCount = weekViolations.length;
        const totalPenalties = weekViolations.reduce((sum, v) => sum + (v.amount_cents || 0), 0);

        // Format penalties based on language
        const penaltiesFormatted = formatCurrency(totalPenalties / 100, lang);

        csvData.push({
          Week: weekLabel,
          Challenge: challenge.title,
          Participant: profile.display_name,
          Fails: failCount,
          Penalties: penaltiesFormatted
        });
      });
    });
  });

  return csvData;
}

/**
 * Format currency with proper localization
 */
function formatCurrency(amount: number, lang: 'de' | 'en'): string {
  if (lang === 'de') {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  } else {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
}

/**
 * Convert CSV data to CSV string
 */
export function convertToCSV(data: CSVExportData[], lang: 'de' | 'en'): string {
  if (!data.length) return '';

  // Define headers based on language
  const headers = lang === 'de' 
    ? ['Woche', 'Challenge', 'Teilnehmer', 'Fails', 'Strafen']
    : ['Week', 'Challenge', 'Participant', 'Fails', 'Penalties'];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      `"${row.Week}"`,
      `"${row.Challenge}"`,
      `"${row.Participant}"`,
      row.Fails.toString(),
      `"${row.Penalties}"`
    ].join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Generate filename based on date range and language
 */
export function generateCSVFilename(start: Date, end: Date, lang: 'de' | 'en'): string {
  const startWeek = getWeek(start, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const endWeek = getWeek(end, { weekStartsOn: 1, firstWeekContainsDate: 4 });
  const year = start.getFullYear();

  if (lang === 'de') {
    if (startWeek === endWeek) {
      return `zusammenfassung_KW${startWeek}.csv`;
    }
    return `zusammenfassung_KW${startWeek}-${endWeek}_${year}.csv`;
  } else {
    if (startWeek === endWeek) {
      return `summary_week${startWeek}.csv`;
    }
    return `summary_week${startWeek}-${endWeek}_${year}.csv`;
  }
}

/**
 * Create beautiful PDF export
 */
export async function exportToPDF(options: ExportOptions): Promise<void> {
  try {
    const csvData = await generateCSVData(options);
    
    if (!csvData.length) {
      throw new Error(options.lang === 'de' 
        ? 'Keine Daten zum Exportieren verfügbar' 
        : 'No data available for export'
      );
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Set up colors and styling
    const primaryColor = '#2563eb';
    const accentColor = '#f1f5f9';
    const textColor = '#1e293b';

    // Header
    doc.setFillColor(primaryColor);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor('#ffffff');
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    const title = options.lang === 'de' ? 'Challenge Übersicht' : 'Challenge Summary';
    doc.text(title, 20, 17);

    // Date range
    const dateRange = `${format(options.start, 'dd.MM.yyyy')} - ${format(options.end, 'dd.MM.yyyy')}`;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(dateRange, pageWidth - 20, 17, { align: 'right' });

    // Summary stats
    const totalFails = csvData.reduce((sum, row) => sum + row.Fails, 0);
    const totalPenalties = csvData.reduce((sum, row) => {
      const amount = parseFloat(row.Penalties.replace(/[€,]/g, '').replace(',', '.'));
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    doc.setTextColor(textColor);
    doc.setFontSize(10);
    const statsY = 35;
    
    if (options.lang === 'de') {
      doc.text(`Gesamt Fails: ${totalFails}`, 20, statsY);
      doc.text(`Gesamt Strafen: ${formatCurrency(totalPenalties, options.lang)}`, 20, statsY + 8);
      doc.text(`Teilnehmer: ${new Set(csvData.map(r => r.Participant)).size}`, 20, statsY + 16);
      doc.text(`Challenges: ${new Set(csvData.map(r => r.Challenge)).size}`, 20, statsY + 24);
    } else {
      doc.text(`Total Fails: ${totalFails}`, 20, statsY);
      doc.text(`Total Penalties: ${formatCurrency(totalPenalties, options.lang)}`, 20, statsY + 8);
      doc.text(`Participants: ${new Set(csvData.map(r => r.Participant)).size}`, 20, statsY + 16);
      doc.text(`Challenges: ${new Set(csvData.map(r => r.Challenge)).size}`, 20, statsY + 24);
    }

    // Table headers
    const headers = options.lang === 'de' 
      ? ['Woche', 'Challenge', 'Teilnehmer', 'Fails', 'Strafen']
      : ['Week', 'Challenge', 'Participant', 'Fails', 'Penalties'];

    // Prepare table data
    const tableData = csvData.map(row => [
      row.Week,
      row.Challenge,
      row.Participant,
      row.Fails.toString(),
      row.Penalties
    ]);

    // Create table
    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 70,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: '#ffffff',
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: textColor,
        halign: 'center'
      },
      alternateRowStyles: {
        fillColor: accentColor
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Week
        1: { cellWidth: 50, halign: 'left' }, // Challenge
        2: { cellWidth: 40, halign: 'left' }, // Participant
        3: { cellWidth: 20 }, // Fails
        4: { cellWidth: 30 } // Penalties
      },
      margin: { left: 20, right: 20 },
      tableLineColor: '#e2e8f0',
      tableLineWidth: 0.5
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    if (finalY < pageHeight - 30) {
      doc.setFontSize(8);
      doc.setTextColor('#64748b');
      const timestamp = new Date().toLocaleString(options.lang === 'de' ? 'de-DE' : 'en-US');
      doc.text(`${options.lang === 'de' ? 'Generiert am' : 'Generated on'}: ${timestamp}`, 20, pageHeight - 15);
    }

    // Generate filename
    const startWeek = getWeek(options.start, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    const endWeek = getWeek(options.end, { weekStartsOn: 1, firstWeekContainsDate: 4 });
    const year = options.start.getFullYear();
    
    const filename = options.lang === 'de'
      ? `challenge-uebersicht-KW${startWeek}-${endWeek}_${year}.pdf`
      : `challenge-summary-week${startWeek}-${endWeek}_${year}.pdf`;

    // Save the PDF
    doc.save(filename);
    
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error(options.lang === 'de' 
      ? 'PDF Export fehlgeschlagen. Bitte versuchen Sie es erneut.' 
      : 'PDF export failed. Please try again.'
    );
  }
}

/**
 * Main export function that handles the complete CSV export process
 */
export async function exportToCSV(options: ExportOptions): Promise<void> {
  // Use PDF export instead of CSV for better presentation
  return exportToPDF(options);
}