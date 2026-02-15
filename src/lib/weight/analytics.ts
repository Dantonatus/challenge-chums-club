import type { WeightEntry } from './types';

/** 7-day simple moving average */
export function movingAverage(entries: WeightEntry[], window = 7): { date: string; avg: number }[] {
  if (entries.length === 0) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map((entry, i) => {
    const start = Math.max(0, i - window + 1);
    const slice = sorted.slice(start, i + 1);
    const avg = slice.reduce((s, e) => s + e.weight_kg, 0) / slice.length;
    return { date: entry.date, avg: Math.round(avg * 10) / 10 };
  });
}

/** Standard deviation of last N entries */
export function volatility(entries: WeightEntry[], lastN = 14): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const slice = sorted.slice(-lastN);
  const mean = slice.reduce((s, e) => s + e.weight_kg, 0) / slice.length;
  const variance = slice.reduce((s, e) => s + (e.weight_kg - mean) ** 2, 0) / slice.length;
  return Math.round(Math.sqrt(variance) * 100) / 100;
}

/** Weekly change: latest vs 7 days ago */
export function weeklyChange(entries: WeightEntry[]): number | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const latestDate = new Date(latest.date);
  const weekAgo = new Date(latestDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  // Find closest entry to a week ago
  let closest = sorted[0];
  let closestDiff = Infinity;
  for (const e of sorted) {
    const diff = Math.abs(new Date(e.date).getTime() - weekAgo.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = e;
    }
  }
  if (closest.date === latest.date) return null;
  return Math.round((latest.weight_kg - closest.weight_kg) * 10) / 10;
}

/** All-time min/max */
export function allTimeExtremes(entries: WeightEntry[]) {
  if (entries.length === 0) return { min: null, max: null };
  let min = entries[0], max = entries[0];
  for (const e of entries) {
    if (e.weight_kg < min.weight_kg) min = e;
    if (e.weight_kg > max.weight_kg) max = e;
  }
  return {
    min: { weight: min.weight_kg, date: min.date },
    max: { weight: max.weight_kg, date: max.date },
  };
}

/** Monthly average for a given YYYY-MM */
export function monthlyAverage(entries: WeightEntry[], yearMonth: string): number | null {
  const monthEntries = entries.filter(e => e.date.startsWith(yearMonth));
  if (monthEntries.length === 0) return null;
  return Math.round(monthEntries.reduce((s, e) => s + e.weight_kg, 0) / monthEntries.length * 10) / 10;
}

/** Trend direction based on 7-day MA */
export function trendDirection(entries: WeightEntry[]): 'up' | 'down' | 'stable' {
  const ma = movingAverage(entries, 7);
  if (ma.length < 3) return 'stable';
  const recent = ma.slice(-3);
  const diff = recent[recent.length - 1].avg - recent[0].avg;
  if (diff > 0.3) return 'up';
  if (diff < -0.3) return 'down';
  return 'stable';
}

/** Get unique months from entries */
export function getMonths(entries: WeightEntry[]): string[] {
  const months = new Set(entries.map(e => e.date.slice(0, 7)));
  return [...months].sort();
}

/** Month summary: avg, min, max, count */
export function monthSummary(entries: WeightEntry[], yearMonth: string) {
  const me = entries.filter(e => e.date.startsWith(yearMonth));
  if (me.length === 0) return null;
  const weights = me.map(e => e.weight_kg);
  return {
    month: yearMonth,
    avg: Math.round(weights.reduce((s, w) => s + w, 0) / weights.length * 10) / 10,
    min: Math.min(...weights),
    max: Math.max(...weights),
    count: me.length,
  };
}
