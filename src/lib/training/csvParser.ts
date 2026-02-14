import type { ParsedCheckin } from './types';

const GERMAN_MONTHS: Record<string, string> = {
  'Januar': '01', 'Februar': '02', 'März': '03', 'April': '04',
  'Mai': '05', 'Juni': '06', 'Juli': '07', 'August': '08',
  'September': '09', 'Oktober': '10', 'November': '11', 'Dezember': '12',
};

function parseGermanDate(raw: string): string {
  // "02 Januar 2026" -> "2026-01-02"
  const parts = raw.trim().split(/\s+/);
  if (parts.length !== 3) return '';
  const [day, monthName, year] = parts;
  const month = GERMAN_MONTHS[monthName];
  if (!month) return '';
  return `${year}-${month}-${day.padStart(2, '0')}`;
}

export function parseCsv(text: string): ParsedCheckin[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  // Skip header line
  const results: ParsedCheckin[] = [];

  for (let i = 1; i < lines.length; i++) {
    // CSV may use semicolons or commas – detect from first data line
    const sep = lines[i].includes(';') ? ';' : ',';
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 3) continue;

    const checkin_date = parseGermanDate(cols[0]);
    const checkin_time = cols[1] || '';
    const facility_name = cols[2] || '';
    const facility_address = cols[3] || '';

    if (!checkin_date || !checkin_time) continue;

    results.push({ checkin_date, checkin_time, facility_name, facility_address });
  }

  return results;
}
