import type { BodyScan } from './types';

/** Get the latest (most recent) scan */
export function latestScan(scans: BodyScan[]): BodyScan | null {
  if (scans.length === 0) return null;
  return scans[scans.length - 1];
}

/** Get the first (oldest) scan */
export function firstScan(scans: BodyScan[]): BodyScan | null {
  if (scans.length === 0) return null;
  return scans[0];
}

/** Get the previous scan (second to last) */
export function previousScan(scans: BodyScan[]): BodyScan | null {
  if (scans.length < 2) return null;
  return scans[scans.length - 2];
}

/** Calculate difference between latest and first/previous scan for a given numeric key */
export function trendDiff(scans: BodyScan[], key: keyof BodyScan, vsFirst = false): number | null {
  const latest = latestScan(scans);
  const compare = vsFirst ? firstScan(scans) : previousScan(scans);
  if (!latest || !compare) return null;
  const a = latest[key] as number | null;
  const b = compare[key] as number | null;
  if (a == null || b == null) return null;
  return Math.round((a - b) * 100) / 100;
}

/** Format a trend number as "+X.X" or "-X.X" */
export function formatTrend(val: number | null, unit = ''): string | undefined {
  if (val == null) return undefined;
  const sign = val > 0 ? '+' : '';
  return `${sign}${val}${unit}`;
}

/** Chart data: composition over time */
export function compositionChartData(scans: BodyScan[]) {
  return scans.map(s => ({
    date: s.scan_date,
    Gewicht: s.weight_kg,
    Muskelmasse: s.muscle_mass_kg,
    Fettmasse: s.fat_mass_kg,
  }));
}

/** Chart data: fat% vs muscle mass over time */
export function fatMuscleChartData(scans: BodyScan[]) {
  return scans.map(s => ({
    date: s.scan_date,
    'Körperfett %': s.fat_percent,
    'Muskelmasse kg': s.muscle_mass_kg,
  }));
}
