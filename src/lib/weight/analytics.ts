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

/** Linear regression (least-squares fit) */
export function linearRegression(entries: WeightEntry[]): { date: string; value: number }[] {
  if (entries.length < 2) return [];
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const n = sorted.length;
  const xs = sorted.map((_, i) => i);
  const ys = sorted.map(e => e.weight_kg);
  const sumX = xs.reduce((s, x) => s + x, 0);
  const sumY = ys.reduce((s, y) => s + y, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const sumX2 = xs.reduce((s, x) => s + x * x, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return sorted.map((e, i) => ({
    date: e.date,
    value: Math.round((slope * i + intercept) * 10) / 10,
  }));
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

/** Damped Holt-Winters Double Exponential Smoothing forecast */
export function forecast(
  entries: WeightEntry[],
  days = 14,
  alpha = 0.4,
  beta = 0.2,
  phi = 0.95,
): { points: { date: string; value: number; simulated: number; lower: number; upper: number }[]; dailySwing: number } {
  if (entries.length < 3) return { points: [], dailySwing: 0 };
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const ys = sorted.map(e => e.weight_kg);

  // Calculate daily swing from historical day-to-day differences
  const dailyDiffs: number[] = [];
  for (let i = 1; i < ys.length; i++) {
    dailyDiffs.push(ys[i] - ys[i - 1]);
  }
  const dailySwing = dailyDiffs.length > 0
    ? Math.sqrt(dailyDiffs.reduce((s, d) => s + d * d, 0) / dailyDiffs.length)
    : 0.3;

  // Initialise level & trend
  let level = ys[0];
  let trend = (ys[Math.min(6, ys.length - 1)] - ys[0]) / Math.min(6, ys.length - 1);

  // Iterate through all data points to fit the model
  for (let i = 0; i < ys.length; i++) {
    const prevLevel = level;
    level = alpha * ys[i] + (1 - alpha) * (level + phi * trend);
    trend = beta * (level - prevLevel) + (1 - beta) * phi * trend;
  }

  // Generate future data points with damped trend
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const result: { date: string; value: number; simulated: number; lower: number; upper: number }[] = [];

  let sumPhi = 0;
  for (let k = 1; k <= days; k++) {
    sumPhi += Math.pow(phi, k);
    const d = new Date(lastDate);
    d.setDate(d.getDate() + k);
    const dateStr = d.toISOString().slice(0, 10);
    const predicted = Math.round((level + sumPhi * trend) * 10) / 10;
    // Deterministic oscillation for realistic daily fluctuation
    const oscillation = dailySwing * Math.sin(k * 1.3 + Math.cos(k * 0.7));
    const simulated = Math.round((predicted + oscillation) * 10) / 10;
    // Confidence band based on user's actual daily variance
    const margin = Math.min(
      Math.round(1.96 * dailySwing * Math.sqrt(k) * 10) / 10,
      2.0,
    );
    result.push({
      date: dateStr,
      value: predicted,
      simulated,
      lower: Math.round((predicted - margin) * 10) / 10,
      upper: Math.round((predicted + margin) * 10) / 10,
    });
  }

  return { points: result, dailySwing: Math.round(dailySwing * 100) / 100 };
}
