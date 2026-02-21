import * as XLSX from 'xlsx';
import type { ParsedScaleEntry } from './types';

// Column header mapping: German Starfit headers → DB fields
const HEADER_MAP: Record<string, keyof Omit<ParsedScaleEntry, 'measured_at'>> = {
  'Gewicht(kg)': 'weight_kg',
  'Gewicht': 'weight_kg',
  'BMI': 'bmi',
  'Körperfettanteil(%)': 'fat_percent',
  'Koerperfettanteil': 'fat_percent',
  'Körperfettanteil': 'fat_percent',
  'Unterhautfett(%)': 'subcutaneous_fat_percent',
  'Unterhautfett': 'subcutaneous_fat_percent',
  'Herzfrequenz(bpm)': 'heart_rate_bpm',
  'Herzfrequenz': 'heart_rate_bpm',
  'Herzindex(L/Min/M²)': 'cardiac_index',
  'Herzindex': 'cardiac_index',
  'Bauchfett': 'visceral_fat',
  'Körperwasser(%)': 'body_water_percent',
  'Koerperwasser': 'body_water_percent',
  'Körperwasser': 'body_water_percent',
  'Skelettmuskelanteil(%)': 'skeletal_muscle_percent',
  'Skelettmuskelanteil': 'skeletal_muscle_percent',
  'Muskelmasse(kg)': 'muscle_mass_kg',
  'Muskelmasse': 'muscle_mass_kg',
  'Knochenmasse(kg)': 'bone_mass_kg',
  'Knochenmasse': 'bone_mass_kg',
  'Protein(%)': 'protein_percent',
  'Protein': 'protein_percent',
  'Grundumsatz(kcal)': 'bmr_kcal',
  'Grundumsatz': 'bmr_kcal',
  'Körperalter': 'metabolic_age',
  'Koerperalter': 'metabolic_age',
};

/**
 * Parse Starfit time format: "HH:MM DD/MM/YYYY" → ISO timestamp
 */
function parseStarfitTime(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  // Format: "21:15 16/02/2026"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s+(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, h, m, d, mo, y] = match;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T${h.padStart(2, '0')}:${m}:00`;
  }
  return null;
}

function toNum(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  const n = Number(val);
  if (!isNaN(n)) return n;
  // Strip unit suffixes: "94.65kg" → "94.65", "82bpm" → "82", "2.6L/Min/M²" → "2.6"
  const str = String(val).trim();
  const match = str.match(/^([0-9]+(?:\.[0-9]+)?)/);
  if (match) {
    const parsed = Number(match[1]);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Parse a binary XLS/XLSX buffer (Starfit format) into ParsedScaleEntry[]
 */
export function parseStarfitXls(data: ArrayBuffer): ParsedScaleEntry[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

  if (rows.length === 0) return [];

  // Find time column (first column, usually "Zeit" or similar)
  const firstRow = rows[0];
  const allKeys = Object.keys(firstRow);
  const timeKey = allKeys.find(k =>
    k.toLowerCase().includes('zeit') || k.toLowerCase().includes('time') || k.toLowerCase().includes('datum')
  ) || allKeys[0]; // fallback to first column

  // Map remaining columns
  const columnMapping: Record<string, keyof Omit<ParsedScaleEntry, 'measured_at'>> = {};
  for (const key of allKeys) {
    if (key === timeKey) continue;
    // Try exact match first, then partial
    const mapped = HEADER_MAP[key];
    if (mapped) {
      columnMapping[key] = mapped;
      continue;
    }
    // Partial matching
    for (const [pattern, field] of Object.entries(HEADER_MAP)) {
      if (key.includes(pattern) || pattern.includes(key)) {
        columnMapping[key] = field;
        break;
      }
    }
  }

  const entries: ParsedScaleEntry[] = [];

  for (const row of rows) {
    const timeVal = row[timeKey];
    const measured_at = parseStarfitTime(String(timeVal));
    if (!measured_at) continue;

    const entry: ParsedScaleEntry = {
      measured_at,
      weight_kg: null,
      bmi: null,
      fat_percent: null,
      subcutaneous_fat_percent: null,
      heart_rate_bpm: null,
      cardiac_index: null,
      visceral_fat: null,
      body_water_percent: null,
      skeletal_muscle_percent: null,
      muscle_mass_kg: null,
      bone_mass_kg: null,
      protein_percent: null,
      bmr_kcal: null,
      metabolic_age: null,
    };

    for (const [col, field] of Object.entries(columnMapping)) {
      const val = toNum(row[col]);
      if (val !== null) {
        (entry as any)[field] = field === 'heart_rate_bpm' || field === 'bmr_kcal' || field === 'metabolic_age'
          ? Math.round(val)
          : val;
      }
    }

    entries.push(entry);
  }

  return entries;
}
