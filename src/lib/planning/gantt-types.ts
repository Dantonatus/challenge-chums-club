import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export interface GanttTask {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  start_date: string; // DATE as yyyy-MM-dd
  end_date: string;
  sort_order: number;
  color: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface GanttTaskFormData {
  title: string;
  project_id: string;
  start_date: string;
  end_date: string;
  description?: string;
  color?: string;
  sort_order?: number;
}

export interface WeekColumn {
  start: Date;
  isoWeek: number;
  label: string;
  year: number;
}

export interface MonthGroup {
  key: string;
  label: string;
  weeks: WeekColumn[];
}

/**
 * Groups ISO weeks by their month (based on week-start Monday).
 */
export function groupWeeksByMonth(weeks: WeekColumn[]): MonthGroup[] {
  const groups: Record<string, MonthGroup> = {};

  for (const week of weeks) {
    const monthKey = format(week.start, 'yyyy-MM');
    if (!groups[monthKey]) {
      groups[monthKey] = {
        key: monthKey,
        label: format(week.start, 'MMMM yyyy', { locale: de }),
        weeks: [],
      };
    }
    groups[monthKey].weeks.push(week);
  }

  return Object.values(groups);
}
