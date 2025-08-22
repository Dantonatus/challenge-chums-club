import { format, startOfWeek, endOfWeek, eachWeekOfInterval, getWeek } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

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
 * Main export function that handles the complete CSV export process
 */
export async function exportToCSV(options: ExportOptions): Promise<void> {
  try {
    const csvData = await generateCSVData(options);
    const csvContent = convertToCSV(csvData, options.lang);
    const filename = generateCSVFilename(options.start, options.end, options.lang);
    
    downloadCSV(csvContent, filename);
  } catch (error) {
    console.error('CSV export failed:', error);
    throw new Error(options.lang === 'de' 
      ? 'Export fehlgeschlagen. Bitte versuchen Sie es erneut.' 
      : 'Export failed. Please try again.'
    );
  }
}