import type { SmartScaleEntry } from './types';

/** Group entries by date (YYYY-MM-DD) */
export function groupByDate(entries: SmartScaleEntry[]): Record<string, SmartScaleEntry[]> {
  const groups: Record<string, SmartScaleEntry[]> = {};
  for (const e of entries) {
    const date = e.measured_at.slice(0, 10);
    if (!groups[date]) groups[date] = [];
    groups[date].push(e);
  }
  return groups;
}

/** Daily average for a numeric field */
export function dailyAverages(
  entries: SmartScaleEntry[],
  field: keyof SmartScaleEntry,
): { date: string; avg: number }[] {
  const groups = groupByDate(entries);
  const result: { date: string; avg: number }[] = [];
  for (const [date, group] of Object.entries(groups)) {
    const vals = group.map(e => e[field] as number | null).filter((v): v is number => v !== null);
    if (vals.length === 0) continue;
    result.push({
      date,
      avg: Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 100) / 100,
    });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Get latest non-null value for a field */
export function latestValue(entries: SmartScaleEntry[], field: keyof SmartScaleEntry): number | null {
  const sorted = [...entries].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  for (const e of sorted) {
    const val = e[field];
    if (val !== null && val !== undefined && typeof val === 'number') return val;
  }
  return null;
}

/** 7-day trend: latest value minus value ~7 days ago */
export function weekTrend(entries: SmartScaleEntry[], field: keyof SmartScaleEntry): number | null {
  const avgs = dailyAverages(entries, field);
  if (avgs.length < 2) return null;
  const latest = avgs[avgs.length - 1];
  const latestDate = new Date(latest.date);
  const weekAgo = new Date(latestDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  let closest = avgs[0];
  let closestDiff = Infinity;
  for (const a of avgs) {
    if (a.date === latest.date) continue;
    const diff = Math.abs(new Date(a.date).getTime() - weekAgo.getTime());
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = a;
    }
  }
  if (closest.date === latest.date) return null;
  return Math.round((latest.avg - closest.avg) * 100) / 100;
}

/** Visceral fat rating zones */
export function visceralFatZone(rating: number): 'healthy' | 'elevated' | 'high' {
  if (rating <= 9) return 'healthy';
  if (rating <= 14) return 'elevated';
  return 'high';
}

/** Heart rate zone */
export function heartRateZone(bpm: number): 'low' | 'normal' | 'elevated' {
  if (bpm < 60) return 'low';
  if (bpm <= 100) return 'normal';
  return 'elevated';
}

/** Morning vs evening comparison for a given date */
export function morningVsEvening(
  entries: SmartScaleEntry[],
  date: string,
  field: keyof SmartScaleEntry,
): { morning: number | null; evening: number | null } {
  const dayEntries = entries.filter(e => e.measured_at.startsWith(date));
  const morning = dayEntries
    .filter(e => { const h = parseInt(e.measured_at.slice(11, 13)); return h < 12; })
    .map(e => e[field] as number | null)
    .filter((v): v is number => v !== null);
  const evening = dayEntries
    .filter(e => { const h = parseInt(e.measured_at.slice(11, 13)); return h >= 12; })
    .map(e => e[field] as number | null)
    .filter((v): v is number => v !== null);
  return {
    morning: morning.length > 0 ? Math.round((morning.reduce((s, v) => s + v, 0) / morning.length) * 100) / 100 : null,
    evening: evening.length > 0 ? Math.round((evening.reduce((s, v) => s + v, 0) / evening.length) * 100) / 100 : null,
  };
}
