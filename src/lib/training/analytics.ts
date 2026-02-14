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
