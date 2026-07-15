import { getISOWeek, getYear, format, parseISO, differenceInCalendarDays } from 'date-fns';
import { de } from 'date-fns/locale';
import type { TrainingCheckin, TimeBucket, TimeBucketData, WeeklyData, MonthlyData, WeekdayData } from './types';

export function getTimeBucket(time: string): TimeBucket {
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 6) return 'Spät';
  if (hour < 12) return 'Morgens';
  if (hour < 15) return 'Mittags';
  if (hour < 18) return 'Nachmittags';
  if (hour < 21) return 'Abends';
  return 'Spät';
}

export function timeBucketDistribution(checkins: TrainingCheckin[]): TimeBucketData[] {
  const buckets: TimeBucket[] = ['Morgens', 'Mittags', 'Nachmittags', 'Abends', 'Spät'];
  const counts = new Map<TimeBucket, number>(buckets.map(b => [b, 0]));
  checkins.forEach(c => {
    const b = getTimeBucket(c.checkin_time);
    counts.set(b, (counts.get(b) || 0) + 1);
  });
  return buckets.map(bucket => ({ bucket, visits: counts.get(bucket) || 0 }));
}

export function weeklyVisits(checkins: TrainingCheckin[]): WeeklyData[] {
  const map = new Map<string, number>();
  checkins.forEach(c => {
    const d = parseISO(c.checkin_date);
    const w = getISOWeek(d);
    const y = getYear(d);
    const key = `${y}-KW${String(w).padStart(2, '0')}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, visits]) => ({ week: week.split('-')[1], visits }));
}

export function monthlyVisits(checkins: TrainingCheckin[]): MonthlyData[] {
  const map = new Map<string, number>();
  checkins.forEach(c => {
    const d = parseISO(c.checkin_date);
    const key = format(d, 'yyyy-MM');
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, visits]) => {
      const d = parseISO(key + '-01');
      return { month: format(d, 'MMM yy', { locale: de }), visits };
    });
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function weekdayDistribution(checkins: TrainingCheckin[]): WeekdayData[] {
  const counts = new Array(7).fill(0);
  checkins.forEach(c => {
    const d = parseISO(c.checkin_date);
    // getDay: 0=Sun, adjust to Mon=0
    const dow = (d.getDay() + 6) % 7;
    counts[dow]++;
  });
  return DAY_LABELS.map((day, i) => ({ day, visits: counts[i] }));
}

export function longestStreak(checkins: TrainingCheckin[]): number {
  const uniqueDates = [...new Set(checkins.map(c => c.checkin_date))].sort();
  if (uniqueDates.length === 0) return 0;
  let max = 1, curr = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(uniqueDates[i]), parseISO(uniqueDates[i - 1]));
    if (diff === 1) { curr++; max = Math.max(max, curr); }
    else { curr = 1; }
  }
  return max;
}

export function currentStreak(checkins: TrainingCheckin[]): number {
  const uniqueDates = [...new Set(checkins.map(c => c.checkin_date))].sort().reverse();
  if (uniqueDates.length === 0) return 0;
  const today = format(new Date(), 'yyyy-MM-dd');
  // streak must include today or yesterday
  const diff0 = differenceInCalendarDays(parseISO(today), parseISO(uniqueDates[0]));
  if (diff0 > 1) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(uniqueDates[i - 1]), parseISO(uniqueDates[i]));
    if (diff === 1) streak++;
    else break;
  }
  return streak;
}

export function visitsThisMonth(checkins: TrainingCheckin[]): number {
  const prefix = format(new Date(), 'yyyy-MM');
  return checkins.filter(c => c.checkin_date.startsWith(prefix)).length;
}

export function visitsLastMonth(checkins: TrainingCheckin[]): number {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prefix = format(last, 'yyyy-MM');
  return checkins.filter(c => c.checkin_date.startsWith(prefix)).length;
}

export function avgVisitsPerWeek(checkins: TrainingCheckin[]): number {
  if (checkins.length === 0) return 0;
  const dates = checkins.map(c => parseISO(c.checkin_date));
  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));
  const weeks = Math.max(1, differenceInCalendarDays(max, min) / 7);
  return Math.round((checkins.length / weeks) * 10) / 10;
}

export function mostCommonTimeBucket(checkins: TrainingCheckin[]): TimeBucket | '–' {
  const dist = timeBucketDistribution(checkins);
  const top = dist.reduce((a, b) => (b.visits > a.visits ? b : a), dist[0]);
  return top && top.visits > 0 ? top.bucket : '–';
}

export function trainingDatesSet(checkins: TrainingCheckin[]): Set<string> {
  return new Set(checkins.map(c => c.checkin_date));
}

// ── Bubble Heatmap ──

export interface BubbleHeatmapPoint {
  day: string;
  slot: string;
  count: number;
}

function roundTo30Min(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const rounded = Math.round(m / 30) * 30;
  const finalH = rounded === 60 ? h + 1 : h;
  const finalM = rounded === 60 ? 0 : rounded;
  return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

export function bubbleHeatmapData(checkins: TrainingCheckin[]): BubbleHeatmapPoint[] {
  const map = new Map<string, number>();
  checkins.forEach(c => {
    const d = parseISO(c.checkin_date);
    const dow = (d.getDay() + 6) % 7;
    const day = DAY_LABELS[dow];
    const slot = roundTo30Min(c.checkin_time);
    const key = `${day}|${slot}`;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).map(([key, count]) => {
    const [day, slot] = key.split('|');
    return { day, slot, count };
  });
}

// ── Rolling Average ──

export interface RollingAvgPoint {
  week: string;
  visits: number;
  avg: number;
}

export function rollingAvgWeekly(checkins: TrainingCheckin[], windowSize = 4): RollingAvgPoint[] {
  const weekly = weeklyVisits(checkins);
  return weekly.map((w, i) => {
    const start = Math.max(0, i - windowSize + 1);
    const window = weekly.slice(start, i + 1);
    const avg = Math.round((window.reduce((s, x) => s + x.visits, 0) / window.length) * 10) / 10;
    return { week: w.week, visits: w.visits, avg };
  });
}

// ── Rest Day Distribution ──

export interface RestDayPoint {
  days: string;
  count: number;
}

export function restDayDistribution(checkins: TrainingCheckin[]): RestDayPoint[] {
  const uniqueDates = [...new Set(checkins.map(c => c.checkin_date))].sort();
  if (uniqueDates.length < 2) return [];
  const gaps = new Map<number, number>();
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(uniqueDates[i]), parseISO(uniqueDates[i - 1])) - 1;
    if (diff >= 0) gaps.set(diff, (gaps.get(diff) || 0) + 1);
  }
  return Array.from(gaps.entries())
    .sort(([a], [b]) => a - b)
    .map(([days, count]) => ({ days: days === 0 ? 'Kein Ruhetag' : `${days} ${days === 1 ? 'Tag' : 'Tage'}`, count }));
}

// ── Personal Records ──

export interface PersonalRecords {
  earliestCheckin: { time: string; date: string } | null;
  latestCheckin: { time: string; date: string } | null;
  busiestDay: { date: string; count: number } | null;
  longestBreak: { days: number; from: string; to: string } | null;
}

export function personalRecords(checkins: TrainingCheckin[]): PersonalRecords {
  if (checkins.length === 0) return { earliestCheckin: null, latestCheckin: null, busiestDay: null, longestBreak: null };

  let earliest = checkins[0], latest = checkins[0];
  const dayCounts = new Map<string, number>();

  checkins.forEach(c => {
    if (c.checkin_time < earliest.checkin_time) earliest = c;
    if (c.checkin_time > latest.checkin_time) latest = c;
    dayCounts.set(c.checkin_date, (dayCounts.get(c.checkin_date) || 0) + 1);
  });

  const busiest = Array.from(dayCounts.entries()).reduce((a, b) => (b[1] > a[1] ? b : a));

  const uniqueDates = [...new Set(checkins.map(c => c.checkin_date))].sort();
  let longestBreak: PersonalRecords['longestBreak'] = null;
  for (let i = 1; i < uniqueDates.length; i++) {
    const diff = differenceInCalendarDays(parseISO(uniqueDates[i]), parseISO(uniqueDates[i - 1]));
    if (!longestBreak || diff > longestBreak.days) {
      longestBreak = { days: diff, from: uniqueDates[i - 1], to: uniqueDates[i] };
    }
  }

  return {
    earliestCheckin: { time: earliest.checkin_time.slice(0, 5), date: format(parseISO(earliest.checkin_date), 'dd. MMM yyyy', { locale: de }) },
    latestCheckin: { time: latest.checkin_time.slice(0, 5), date: format(parseISO(latest.checkin_date), 'dd. MMM yyyy', { locale: de }) },
    busiestDay: { date: format(parseISO(busiest[0]), 'dd. MMM yyyy', { locale: de }), count: busiest[1] },
    longestBreak,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PERFORMANCE REPORTING — deterministische, reine Funktionen
// Alle Berechnungen laufen jahresübergreifend auf lokalen Daten.
// ═══════════════════════════════════════════════════════════════════

import { parseLocalDate } from '@/lib/health/periods';
import type { Period } from '@/lib/health/periods';

const DAY = 86_400_000;

function isoWeekKey(d: Date): string {
  // ISO 8601: Woche mit Do, Montag = Wochenstart. Jahresübergreifend korrekt.
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((t.getTime() - yearStart.getTime()) / DAY) + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function isoWeekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mo=0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}

export interface CompletedWeekBucket {
  key: string;            // 2025-W12
  weekStart: Date;
  weekEnd: Date;
  visits: number;         // Gesamt-Check-ins (kann Mehrfach/Tag enthalten)
  activeDays: number;     // unique Trainingstage
  isCurrent: boolean;     // laufende, unvollständige Woche
  inGoal: boolean | null; // null wenn kein Ziel
}

export function completedWeeklySeries(
  checkins: TrainingCheckin[],
  range: Period,
  now: Date = new Date(),
  weeklyGoal?: number | null,
): CompletedWeekBucket[] {
  // Serie umfasst alle ISO-Wochen, die den Range berühren – auch leere Wochen.
  const start = isoWeekStart(range.start);
  const end = isoWeekStart(range.end);
  const currentWeekStart = isoWeekStart(now);

  const buckets = new Map<string, CompletedWeekBucket>();
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    const key = isoWeekKey(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    buckets.set(key, {
      key,
      weekStart: new Date(cursor),
      weekEnd,
      visits: 0,
      activeDays: 0,
      isCurrent: cursor.getTime() === currentWeekStart.getTime(),
      inGoal: null,
    });
    cursor = new Date(cursor.getTime() + 7 * DAY);
  }

  const daysSeen = new Map<string, Set<string>>();
  for (const c of checkins) {
    const d = parseLocalDate(c.checkin_date);
    if (d.getTime() < range.start.getTime() || d.getTime() > range.end.getTime()) continue;
    const wStart = isoWeekStart(d);
    const key = isoWeekKey(wStart);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.visits += 1;
    if (!daysSeen.has(key)) daysSeen.set(key, new Set());
    daysSeen.get(key)!.add(c.checkin_date);
  }

  for (const [key, set] of daysSeen) {
    const b = buckets.get(key);
    if (b) b.activeDays = set.size;
  }

  if (weeklyGoal && weeklyGoal > 0) {
    for (const b of buckets.values()) {
      b.inGoal = b.isCurrent ? null : b.activeDays >= weeklyGoal;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
}

export function previousComparableRange(range: Period): Period {
  const len = range.end.getTime() - range.start.getTime();
  return {
    mode: range.mode,
    start: new Date(range.start.getTime() - len - DAY),
    end: new Date(range.start.getTime() - DAY),
  };
}

export interface GoalAttainment {
  total: number;         // abgeschlossene Wochen im Zeitraum
  inGoal: number;
  rate: number;          // 0..1
  activeWeeks: number;   // Wochen mit ≥1 aktivem Tag
}

export function trainingGoalAttainment(
  weeks: CompletedWeekBucket[],
  target?: number | null,
): GoalAttainment {
  const completed = weeks.filter(w => !w.isCurrent);
  const activeWeeks = completed.filter(w => w.activeDays > 0).length;
  if (!target || target <= 0) {
    return { total: completed.length, inGoal: 0, rate: 0, activeWeeks };
  }
  const inGoal = completed.filter(w => w.activeDays >= target).length;
  return {
    total: completed.length,
    inGoal,
    rate: completed.length ? inGoal / completed.length : 0,
    activeWeeks,
  };
}

export function rollingFrequencyChange(current4: CompletedWeekBucket[], previous4: CompletedWeekBucket[]): {
  currentAvg: number;
  previousAvg: number;
  deltaAbs: number;
  deltaPct: number | null;
} {
  const avg = (ws: CompletedWeekBucket[]) => {
    const c = ws.filter(w => !w.isCurrent);
    if (!c.length) return 0;
    return c.reduce((s, w) => s + w.activeDays, 0) / c.length;
  };
  const currentAvg = avg(current4);
  const previousAvg = avg(previous4);
  const deltaAbs = currentAvg - previousAvg;
  const deltaPct = previousAvg > 0 ? (deltaAbs / previousAvg) : null;
  return { currentAvg, previousAvg, deltaAbs, deltaPct };
}

export function medianRestGap(checkins: TrainingCheckin[]): number | null {
  const uniq = [...new Set(checkins.map(c => c.checkin_date))].sort();
  if (uniq.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < uniq.length; i++) {
    const d = Math.round((parseLocalDate(uniq[i]).getTime() - parseLocalDate(uniq[i - 1]).getTime()) / DAY);
    gaps.push(d);
  }
  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}

export interface GapInfo {
  days: number;
  from: string;
  to: string;
}

export function longestGapWithinRange(checkins: TrainingCheckin[], range: Period): GapInfo | null {
  const inRange = checkins
    .filter(c => {
      const d = parseLocalDate(c.checkin_date);
      return d.getTime() >= range.start.getTime() && d.getTime() <= range.end.getTime();
    })
    .map(c => c.checkin_date);
  const uniq = [...new Set(inRange)].sort();
  if (uniq.length < 2) return null;
  let best: GapInfo | null = null;
  for (let i = 1; i < uniq.length; i++) {
    const d = Math.round((parseLocalDate(uniq[i]).getTime() - parseLocalDate(uniq[i - 1]).getTime()) / DAY);
    if (!best || d > best.days) best = { days: d, from: uniq[i - 1], to: uniq[i] };
  }
  return best;
}

export interface CurrentGap {
  days: number;
  since: string;
  vsMedian: number | null; // Faktor gg. persönlichem Median
}

export function currentGap(checkins: TrainingCheckin[], now: Date = new Date()): CurrentGap | null {
  const uniq = [...new Set(checkins.map(c => c.checkin_date))].sort();
  if (!uniq.length) return null;
  const last = uniq[uniq.length - 1];
  const days = Math.round((now.getTime() - parseLocalDate(last).getTime()) / DAY);
  const median = medianRestGap(checkins);
  return { days, since: last, vsMedian: median && median > 0 ? days / median : null };
}

export interface TrainingWindow {
  weekdayIdx: number;   // 0=Mo
  weekdayLabel: string;
  hourStart: number;    // 8..23
  hourEnd: number;      // exklusiv
  count: number;
}

export function preferredTrainingWindow(checkins: TrainingCheckin[]): TrainingWindow | null {
  if (!checkins.length) return null;
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  // Zähle pro (Wochentag, 90-Min-Slot).
  const grid = new Map<string, number>();
  for (const c of checkins) {
    const d = parseLocalDate(c.checkin_date);
    const dow = (d.getDay() + 6) % 7;
    const hour = parseInt(c.checkin_time.split(':')[0], 10);
    if (isNaN(hour)) continue;
    const slot = Math.floor(hour / 1.5) * 1.5; // 90-min Buckets
    const key = `${dow}|${slot}`;
    grid.set(key, (grid.get(key) || 0) + 1);
  }
  let best: TrainingWindow | null = null;
  for (const [key, count] of grid) {
    const [dow, slot] = key.split('|').map(Number);
    if (!best || count > best.count) {
      best = {
        weekdayIdx: dow,
        weekdayLabel: labels[dow],
        hourStart: slot,
        hourEnd: slot + 1.5,
        count,
      };
    }
  }
  return best;
}

export function trainingHourDomain(checkins: TrainingCheckin[]): [number, number] {
  if (!checkins.length) return [6, 22];
  let min = 24, max = 0;
  for (const c of checkins) {
    const h = parseInt(c.checkin_time.split(':')[0], 10);
    const m = parseInt(c.checkin_time.split(':')[1] || '0', 10);
    const hh = h + m / 60;
    if (hh < min) min = hh;
    if (hh > max) max = hh;
  }
  // +/- 60 Min Padding
  return [Math.max(0, Math.floor(min - 1)), Math.min(24, Math.ceil(max + 1))];
}

export interface RoutineCell {
  weekdayIdx: number;
  weekdayLabel: string;
  hour: number;    // Ganzzahl Stunde
  count: number;
}

export function routineHeatmap(checkins: TrainingCheckin[]): RoutineCell[] {
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const map = new Map<string, number>();
  for (const c of checkins) {
    const d = parseLocalDate(c.checkin_date);
    const dow = (d.getDay() + 6) % 7;
    const hour = parseInt(c.checkin_time.split(':')[0], 10);
    if (isNaN(hour)) continue;
    const key = `${dow}|${hour}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  const out: RoutineCell[] = [];
  for (const [key, count] of map) {
    const [dow, hour] = key.split('|').map(Number);
    out.push({ weekdayIdx: dow, weekdayLabel: labels[dow], hour, count });
  }
  return out;
}

export interface DailyRhythmPoint {
  date: string;      // YYYY-MM-DD
  trained: boolean;
  visits: number;
}

export function dailyRhythm(checkins: TrainingCheckin[], days: number, endDate: Date): DailyRhythmPoint[] {
  const set = new Map<string, number>();
  for (const c of checkins) set.set(c.checkin_date, (set.get(c.checkin_date) || 0) + 1);
  const out: DailyRhythmPoint[] = [];
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * DAY);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const visits = set.get(iso) || 0;
    out.push({ date: iso, trained: visits > 0, visits });
  }
  return out;
}

export interface TrainingAnnotation {
  weekKey: string;
  kind: 'best' | 'gap' | 'resume';
  label: string;
}

export function detectTrainingAnnotations(
  weeks: CompletedWeekBucket[],
): TrainingAnnotation[] {
  const annotations: TrainingAnnotation[] = [];
  const completed = weeks.filter(w => !w.isCurrent);
  if (!completed.length) return annotations;

  const best = completed.reduce((a, b) => (b.activeDays > a.activeDays ? b : a));
  if (best.activeDays > 0) {
    annotations.push({ weekKey: best.key, kind: 'best', label: `Beste Woche: ${best.activeDays} Tage` });
  }

  // längste Null-Serie
  let runStart = -1, runLen = 0, bestStart = -1, bestLen = 0;
  for (let i = 0; i < completed.length; i++) {
    if (completed[i].activeDays === 0) {
      if (runStart < 0) runStart = i;
      runLen++;
      if (runLen > bestLen) { bestLen = runLen; bestStart = runStart; }
    } else {
      runStart = -1; runLen = 0;
    }
  }
  if (bestLen >= 2) {
    annotations.push({
      weekKey: completed[bestStart].key,
      kind: 'gap',
      label: `${bestLen} inaktive Wochen`,
    });
    const resumeIdx = bestStart + bestLen;
    if (resumeIdx < completed.length) {
      annotations.push({
        weekKey: completed[resumeIdx].key,
        kind: 'resume',
        label: 'Wiederaufnahme',
      });
    }
  }
  return annotations;
}
