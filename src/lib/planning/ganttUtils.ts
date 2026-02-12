import { startOfWeek, endOfWeek, getISOWeek, addWeeks, format, differenceInCalendarDays, getMonth, getYear } from 'date-fns';
import { de } from 'date-fns/locale';
import type { WeekColumn } from './types';

/**
 * Build an array of ISO week columns for a given date range.
 * Each column represents one ISO week with start/end dates.
 */
export function buildWeekColumns(rangeStart: Date, rangeEnd: Date): WeekColumn[] {
  const weeks: WeekColumn[] = [];
  let current = startOfWeek(rangeStart, { weekStartsOn: 1 });
  const end = endOfWeek(rangeEnd, { weekStartsOn: 1 });

  while (current <= end) {
    const weekEnd = endOfWeek(current, { weekStartsOn: 1 });
    const isoWeek = getISOWeek(current);
    // Use Thursday of the week for month assignment (ISO standard)
    const thursday = new Date(current);
    thursday.setDate(thursday.getDate() + 3);

    weeks.push({
      start: new Date(current),
      end: weekEnd,
      isoWeek,
      year: getYear(thursday),
      label: `KW${isoWeek}`,
      month: getMonth(thursday),
    });
    current = addWeeks(current, 1);
  }
  return weeks;
}

/**
 * Group weeks by month for the header row.
 * Returns array of { label, colSpan, month, year }.
 */
export function groupWeeksByMonth(weeks: WeekColumn[]): Array<{ label: string; colSpan: number; month: number; year: number }> {
  if (weeks.length === 0) return [];

  const groups: Array<{ label: string; colSpan: number; month: number; year: number }> = [];
  let currentMonth = weeks[0].month;
  let currentYear = weeks[0].year;
  let count = 0;

  for (const week of weeks) {
    if (week.month === currentMonth && week.year === currentYear) {
      count++;
    } else {
      groups.push({
        label: format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy', { locale: de }),
        colSpan: count,
        month: currentMonth,
        year: currentYear,
      });
      currentMonth = week.month;
      currentYear = week.year;
      count = 1;
    }
  }
  // Push last group
  groups.push({
    label: format(new Date(currentYear, currentMonth, 1), 'MMMM yyyy', { locale: de }),
    colSpan: count,
    month: currentMonth,
    year: currentYear,
  });

  return groups;
}

/**
 * Calculate the horizontal position (as fraction 0-1) of a date within the week columns.
 */
export function dateToPosition(date: Date, weeks: WeekColumn[]): number {
  if (weeks.length === 0) return 0;
  const totalStart = weeks[0].start.getTime();
  const totalEnd = weeks[weeks.length - 1].end.getTime();
  const totalRange = totalEnd - totalStart;
  if (totalRange === 0) return 0;
  
  const pos = (date.getTime() - totalStart) / totalRange;
  return Math.max(0, Math.min(1, pos));
}

/**
 * Calculate left% and width% for a task bar.
 */
export function taskBarPosition(taskStart: Date, taskEnd: Date, weeks: WeekColumn[]): { left: number; width: number } {
  const left = dateToPosition(taskStart, weeks);
  const right = dateToPosition(taskEnd, weeks);
  return {
    left: left * 100,
    width: Math.max((right - left) * 100, 1), // minimum 1% width
  };
}

/**
 * Check if a date is today.
 */
export function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
}

/**
 * Get today line position as percentage.
 */
export function todayPosition(weeks: WeekColumn[]): number | null {
  const now = new Date();
  if (weeks.length === 0) return null;
  if (now < weeks[0].start || now > weeks[weeks.length - 1].end) return null;
  return dateToPosition(now, weeks) * 100;
}
