import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, pointerWithin } from '@dnd-kit/core';
import { startOfWeek } from 'date-fns';
import { useWeekTasks } from '@/hooks/useWeekTasks';
import { useUpdateTask } from '@/hooks/useTasks';
import { WeekHeader } from './WeekHeader';
import { DayColumn } from './DayColumn';
import { UnscheduledTray } from './UnscheduledTray';
import { CalendarTaskCard } from './CalendarTaskCard';
import { TaskDetailSheet } from '../TaskDetailSheet';
import { QuickAdd } from '../QuickAdd';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Task } from '@/lib/tasks/types';

export function WeekCalendarView() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);

  const { 
    weekLabel, 
    days, 
    unscheduledTasks, 
    isLoading,
    goToNextWeek,
    goToPrevWeek,
  } = useWeekTasks(currentWeekStart);

  const updateTask = useUpdateTask();

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekStart(goToPrevWeek());
  }, [goToPrevWeek]);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart(goToNextWeek());
  }, [goToNextWeek]);

  const handleToday = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    setSheetOpen(true);
  }, []);

  const handleAddTask = useCallback((date: string) => {
    setQuickAddDate(date);
    // Scroll to QuickAdd
    setTimeout(() => {
      const input = document.querySelector('input[aria-label="Quick add task"]') as HTMLInputElement;
      input?.focus();
    }, 100);
  }, []);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task | undefined;
    if (task) {
      setActiveTask(task);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveTask(null);
    
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newDate = over.data.current?.date as string | null;

    // Get current task's date
    const task = active.data.current?.task as Task | undefined;
    if (!task) return;

    // If dropping on same date, do nothing
    if (task.due_date === newDate) return;

    // Update task's due date
    updateTask.mutate(
      { id: taskId, due_date: newDate || undefined },
      {
        onSuccess: () => {
          if (newDate) {
            toast.success('Aufgabe verschoben');
          } else {
            toast.success('Aufgabe ungeplant');
          }
        },
      }
    );
  }, [updateTask]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-7 gap-1">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WeekHeader
        weekLabel={weekLabel}
        onPrevWeek={handlePrevWeek}
        onNextWeek={handleNextWeek}
        onToday={handleToday}
        currentWeekStart={currentWeekStart}
      />

      {/* QuickAdd with date preset */}
      <QuickAdd 
        defaultDueDate={quickAddDate || undefined}
        placeholder={quickAddDate ? `Aufgabe für ${quickAddDate} hinzufügen...` : undefined}
      />

      <DndContext
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Week grid - desktop */}
        <div className="hidden md:grid grid-cols-7 border rounded-xl overflow-hidden bg-card">
          {days.map((day) => (
            <DayColumn
              key={day.dateString}
              dateString={day.dateString}
              dayName={day.dayName}
              dayNumber={day.dayNumber}
              isToday={day.isToday}
              isWeekend={day.isWeekend}
              tasks={day.tasks}
              onTaskClick={handleTaskClick}
              onAddTask={handleAddTask}
            />
          ))}
        </div>

        {/* Mobile: single day view with day selector */}
        <div className="md:hidden">
          <MobileDayView
            days={days}
            onTaskClick={handleTaskClick}
            onAddTask={handleAddTask}
          />
        </div>

        {/* Unscheduled tasks tray */}
        <UnscheduledTray
          tasks={unscheduledTasks}
          onTaskClick={handleTaskClick}
        />

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask && (
            <div className="w-[180px]">
              <CalendarTaskCard task={activeTask} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task detail sheet */}
      <TaskDetailSheet
        task={selectedTask}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}

// Mobile single-day view component
function MobileDayView({ 
  days, 
  onTaskClick, 
  onAddTask 
}: { 
  days: { dateString: string; dayName: string; dayNumber: number; isToday: boolean; tasks: Task[] }[];
  onTaskClick: (task: Task) => void;
  onAddTask: (date: string) => void;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const todayIndex = days.findIndex(d => d.isToday);
    return todayIndex >= 0 ? todayIndex : 0;
  });

  const selectedDay = days[selectedDayIndex];

  return (
    <div>
      {/* Day selector pills */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-2">
        {days.map((day, index) => (
          <button
            key={day.dateString}
            onClick={() => setSelectedDayIndex(index)}
            className={`
              flex flex-col items-center px-3 py-2 rounded-xl min-w-[50px] transition-all
              ${index === selectedDayIndex
                ? 'bg-primary text-primary-foreground'
                : day.isToday
                  ? 'bg-primary/20 text-primary'
                  : 'bg-secondary text-secondary-foreground'
              }
            `}
          >
            <span className="text-xs font-medium">{day.dayName}</span>
            <span className="text-lg font-bold">{day.dayNumber}</span>
            {day.tasks.length > 0 && (
              <span className="text-[10px] mt-0.5">
                {day.tasks.length} {day.tasks.length === 1 ? 'Aufgabe' : 'Aufgaben'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks for selected day */}
      <div className="space-y-2">
        {selectedDay.tasks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Keine Aufgaben für diesen Tag</p>
            <button
              onClick={() => onAddTask(selectedDay.dateString)}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Aufgabe hinzufügen
            </button>
          </div>
        ) : (
          selectedDay.tasks.map((task) => (
            <CalendarTaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
            />
          ))
        )}
      </div>
    </div>
  );
}