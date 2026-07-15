// Deterministische Perioden-Helfer für das Performance-Intelligence-Reporting.
// Zeitzone-neutral: alle Berechnungen laufen auf Local-Time (Europe/Berlin für den User).

export type PeriodMode = '4w' | '12w' | '6m' | 'ytd' | '1y' | 'all' | 'custom';

export interface Period {
  start: Date;
  end: Date;
  mode: PeriodMode;
}

export type ComparisonMode = 'previous' | 'start' | 'none';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

export function addMonths(d: Date, months: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

export function diffDaysInclusive(a: Date, b: Date): number {
  return Math.round((endOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS) + 1;
}

export function parseLocalDate(iso: string): Date {
  // "YYYY-MM-DD" bzw. "YYYY-MM-DDTHH:mm:ss…" ohne unbeabsichtigten UTC-Shift.
  if (!iso) return new Date(NaN);
  const [datePart, timePart] = iso.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return new Date(iso);
  if (timePart) {
    const [hh = '0', mm = '0', ss = '0'] = timePart.replace('Z', '').split(':');
    return new Date(y, m - 1, d, Number(hh), Number(mm), Number(ss.slice(0, 2)));
  }
  return new Date(y, m - 1, d);
}

export function getPresetPeriod(mode: PeriodMode, now: Date, earliest?: Date): Period {
  const end = endOfDay(now);
  switch (mode) {
    case '4w':
      return { start: startOfDay(addDays(now, -27)), end, mode };
    case '12w':
      return { start: startOfDay(addDays(now, -83)), end, mode };
    case '6m':
      return { start: startOfDay(addMonths(now, -6)), end, mode };
    case 'ytd':
      return { start: startOfDay(new Date(now.getFullYear(), 0, 1)), end, mode };
    case '1y':
      return { start: startOfDay(addMonths(now, -12)), end, mode };
    case 'all':
      return { start: startOfDay(earliest ?? addMonths(now, -12)), end, mode };
    case 'custom':
    default:
      return { start: startOfDay(addMonths(now, -3)), end, mode: 'custom' };
  }
}

export function getPreviousPeriod(period: Period): Period {
  const len = period.end.getTime() - period.start.getTime();
  return {
    start: new Date(period.start.getTime() - len - DAY_MS),
    end: new Date(period.start.getTime() - DAY_MS),
    mode: period.mode,
  };
}

export function resolveReferenceDate(period: Period, latestDataDate: Date | null): Date {
  if (!latestDataDate) return period.end;
  return latestDataDate.getTime() < period.end.getTime() ? latestDataDate : period.end;
}

export function isPeriodComplete(period: Period, now: Date): boolean {
  return period.end.getTime() <= now.getTime();
}

export function formatPeriodLabel(period: Period, locale = 'de-DE'): string {
  const fmt = new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt.format(period.start)} – ${fmt.format(period.end)}`;
}

export function filterByPeriod<T extends { date?: string; scan_date?: string; checkin_date?: string; measured_at?: string }>(
  rows: T[],
  period: Period,
  key: keyof T,
): T[] {
  return rows.filter((r) => {
    const raw = r[key] as unknown as string | undefined;
    if (!raw) return false;
    const d = parseLocalDate(raw);
    return d.getTime() >= period.start.getTime() && d.getTime() <= period.end.getTime();
  });
}
