import { useEffect, useRef, useCallback } from 'react';
import { useTasks, useUpdateTask, useCompleteTask } from './useTasks';
import { toast } from 'sonner';
import { parseISO, isToday, isBefore, addMinutes, differenceInMilliseconds, format, addDays } from 'date-fns';
import { getSnoozeDate } from '@/lib/tasks/parser';
import type { Task } from '@/lib/tasks/types';

interface ReminderTimer {
  taskId: string;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Hook that manages in-app task reminders
 * - Schedules reminders for tasks with due_date/due_time
 * - Shows toast notifications at the reminder time
 * - Provides snooze and complete actions
 */
export function useTaskReminders() {
  const timersRef = useRef<ReminderTimer[]>([]);
  const shownRemindersRef = useRef<Set<string>>(new Set());
  
  // Fetch tasks due today or in the future
  const { data: tasks } = useTasks({ 
    status: ['open', 'in_progress'],
  });
  
  const updateTask = useUpdateTask();
  const completeTask = useCompleteTask();

  const handleSnooze = useCallback((taskId: string) => {
    const snoozeDate = getSnoozeDate('later');
    updateTask.mutate({
      id: taskId,
      due_date: format(snoozeDate, 'yyyy-MM-dd'),
      due_time: format(snoozeDate, 'HH:mm'),
    });
  }, [updateTask]);

  const showReminderToast = useCallback((task: Task) => {
    // Don't show the same reminder twice in this session
    if (shownRemindersRef.current.has(task.id)) return;
    shownRemindersRef.current.add(task.id);

    toast(
      `🔔 ${task.title}`,
      {
        description: task.due_time ? `Fällig um ${task.due_time} Uhr` : 'Fällig heute',
        duration: 60000, // Show for 1 minute
        action: {
          label: 'Erledigt',
          onClick: () => completeTask.mutate(task.id),
        },
        cancel: {
          label: 'Später',
          onClick: () => handleSnooze(task.id),
        },
      }
    );
  }, [completeTask, handleSnooze]);

  const scheduleReminder = useCallback((task: Task) => {
    if (!task.reminder_enabled || !task.due_date) return null;

    const now = new Date();
    let reminderTime: Date;

    if (task.due_time) {
      // Task has a specific time
      const [hours, minutes] = task.due_time.split(':').map(Number);
      const dueDateTime = parseISO(task.due_date);
      dueDateTime.setHours(hours, minutes, 0, 0);
      
      // Apply offset if set
      const offsetMinutes = task.reminder_offset_minutes || 0;
      reminderTime = addMinutes(dueDateTime, -offsetMinutes);
    } else {
      // No specific time - remind at 9:00 AM on the due date
      reminderTime = parseISO(task.due_date);
      reminderTime.setHours(9, 0, 0, 0);
    }

    // Don't schedule if reminder time has passed
    if (isBefore(reminderTime, now)) {
      // If it's still today and the task is due, show immediately for overdue
      if (isToday(parseISO(task.due_date))) {
        return { immediate: true };
      }
      return null;
    }

    const msUntilReminder = differenceInMilliseconds(reminderTime, now);
    
    // Only schedule if within the next 24 hours
    if (msUntilReminder > 24 * 60 * 60 * 1000) {
      return null;
    }

    return { msUntilReminder };
  }, []);

  useEffect(() => {
    // Clear existing timers
    timersRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
    timersRef.current = [];

    if (!tasks) return;

    const today = new Date().toISOString().split('T')[0];

    tasks.forEach((task) => {
      // Only process tasks due today or in the future (within 24h)
      if (!task.due_date || task.due_date < today) return;
      
      const schedule = scheduleReminder(task);
      if (!schedule) return;

      if (schedule.immediate) {
        // Show immediately for overdue/due now tasks
        showReminderToast(task);
      } else if (schedule.msUntilReminder) {
        const timeoutId = setTimeout(() => {
          showReminderToast(task);
        }, schedule.msUntilReminder);

        timersRef.current.push({ taskId: task.id, timeoutId });
      }
    });

    return () => {
      timersRef.current.forEach(({ timeoutId }) => clearTimeout(timeoutId));
      timersRef.current = [];
    };
  }, [tasks, scheduleReminder, showReminderToast]);

  return null; // This hook doesn't render anything
}

/**
 * Get count of overdue tasks
 */
export function useOverdueTasks() {
  const { data: tasks } = useTasks({ status: ['open', 'in_progress'] });
  const today = new Date().toISOString().split('T')[0];
  
  const overdueTasks = tasks?.filter(t => t.due_date && t.due_date < today) || [];
  
  return {
    count: overdueTasks.length,
    tasks: overdueTasks,
  };
}