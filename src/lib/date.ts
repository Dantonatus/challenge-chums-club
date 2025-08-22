import { startOfWeek, endOfWeek, getWeek, format } from "date-fns";
import { de, enUS } from "date-fns/locale";

export function startOfISOWeek(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function endOfISOWeek(date: Date): Date {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function isoWeekOf(date: Date): number {
  return getWeek(date, { weekStartsOn: 1, firstWeekContainsDate: 4 });
}

export function weekRangeLabel(startDate: Date, endDate: Date, lang: 'de' | 'en'): string {
  const locale = lang === 'de' ? de : enUS;
  const startWeek = isoWeekOf(startDate);
  const endWeek = isoWeekOf(endDate);
  const year = startDate.getFullYear();
  
  if (startWeek === endWeek) {
    return lang === 'de' ? `KW ${startWeek}` : `Week ${startWeek}`;
  }
  
  return lang === 'de' 
    ? `KW ${startWeek}–${endWeek} / ${year}`
    : `Week ${startWeek}–${endWeek} / ${year}`;
}

export function formatWeekRange(startDate: Date, endDate: Date, lang: 'de' | 'en'): string {
  const locale = lang === 'de' ? de : enUS;
  return `${format(startDate, 'dd.MM', { locale })} – ${format(endDate, 'dd.MM.yyyy', { locale })}`;
}