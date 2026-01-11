import { useMemo } from 'react';
import { startOfWeek, endOfWeek, format, addWeeks, subWeeks, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { useTasks } from './useTasks';
import type { Task } from '@/lib/tasks/types';

export interface WeekDay {
  date: Date;
  dateString: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  tasks: Task[];
}

export interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  days: WeekDay[];
  unscheduledTasks: Task[];
  weekLabel: string;
}

/**
 * Hook for fetching and organizing tasks for a week calendar view
 */
export function useWeekTasks(weekStart: Date) {
  // Calculate week boundaries (Monday to Sunday)
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
  
  // Fetch all open tasks
  const { data: allTasks, isLoading, error } = useTasks({
    status: ['open', 'in_progress'],
  });

  const weekData = useMemo((): WeekData => {
    const days = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });
    
    // Get unscheduled tasks (no due date)
    const unscheduledTasks = allTasks?.filter(task => !task.due_date) || [];
    
    // Organize tasks by day
    const weekDays: WeekDay[] = days.map(date => {
      const dateString = format(date, 'yyyy-MM-dd');
      const dayTasks = allTasks?.filter(task => task.due_date === dateString) || [];
      
      // Sort tasks by time, then priority
      dayTasks.sort((a, b) => {
        // First by time (tasks with time come first)
        if (a.due_time && !b.due_time) return -1;
        if (!a.due_time && b.due_time) return 1;
        if (a.due_time && b.due_time) {
          return a.due_time.localeCompare(b.due_time);
        }
        // Then by priority
        return a.priority.localeCompare(b.priority);
      });
      
      const dayOfWeek = date.getDay();
      
      return {
        date,
        dateString,
        dayName: format(date, 'EEE', { locale: de }),
        dayNumber: date.getDate(),
        isToday: isToday(date),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        tasks: dayTasks,
      };
    });

    // Generate week label
    const weekLabel = `${format(weekStartDate, 'd. MMM', { locale: de })} – ${format(weekEndDate, 'd. MMM yyyy', { locale: de })}`;

    return {
      weekStart: weekStartDate,
      weekEnd: weekEndDate,
      days: weekDays,
      unscheduledTasks,
      weekLabel,
    };
  }, [weekStartDate, weekEndDate, allTasks]);

  return {
    ...weekData,
    isLoading,
    error,
    goToNextWeek: () => addWeeks(weekStart, 1),
    goToPrevWeek: () => subWeeks(weekStart, 1),
  };
}

/**
 * Check if a date is in the given week
 */
export function isInWeek(date: Date, weekStart: Date): boolean {
  const weekStartDate = startOfWeek(weekStart, { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(weekStart, { weekStartsOn: 1 });
  return date >= weekStartDate && date <= weekEndDate;
}