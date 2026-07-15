import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/health/periods';

export const REPORT_COLORS = {
  ink: '#111827',
  inkMuted: '#4B5563',
  inkSubtle: '#6B7280',
  hairline: '#E5E7EB',
  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',
  accent: '#2F9B6E',
  accentSoft: '#DFF3E9',
  primary: '#2563EB',
  primarySoft: '#DBEAFE',
  warn: '#B45309',
  warnSoft: '#FEF3C7',
  neutral: '#6B7280',
  positive: '#15803D',
  negative: '#B91C1C',
  fat: '#F59E0B',
  muscle: '#2F9B6E',
  weight: '#2563EB',
  projection: '#8B5CF6',
  goal: '#0EA5E9',
} as const;

/** German-locale number formatter */
export function numDe(n: number | null | undefined, digits = 1): string {
  if (n == null || !isFinite(n)) return '–';
  return n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Signed delta with unit */
export function signed(n: number | null | undefined, unit = '', digits = 1): string {
  if (n == null || !isFinite(n)) return '–';
  const s = n > 0 ? '+' : '';
  return `${s}${numDe(n, digits)}${unit ? ' ' + unit : ''}`;
}

export function pctDe(x: number | null | undefined, digits = 0): string {
  if (x == null || !isFinite(x)) return '–';
  const s = x > 0 ? '+' : '';
  return `${s}${numDe(x * 100, digits)} %`;
}

export function fmtDateDe(iso: string | Date | null | undefined, pattern = 'dd. MMM yyyy'): string {
  if (!iso) return '–';
  const d = typeof iso === 'string' ? parseLocalDate(iso) : iso;
  if (!(d instanceof Date) || isNaN(d.getTime())) return '–';
  return format(d, pattern, { locale: de });
}

export function fmtDateTimeDe(d: Date): string {
  return format(d, 'dd.MM.yyyy, HH:mm', { locale: de }) + ' Uhr';
}

/** Convert hex "#RRGGBB" to [r, g, b] 0-255. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const bigint = parseInt(h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h, 16);
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

/**
 * jsPDF's built-in Helvetica uses WinAnsi (CP1252) which covers Latin-1 (German
 * umlauts, ß) but not Greek letters or many typographic punctuation marks.
 * Replace the common offenders with WinAnsi-safe equivalents.
 */
export function sanitizePdfText(input: string): string {
  return input
    .replace(/Δ/g, 'd.')
    .replace(/[·•]/g, '-')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/±/g, '+/-')
    .replace(/–|—/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/…/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[\u2000-\u200F\u2028-\u202F]/g, ' ');
}

