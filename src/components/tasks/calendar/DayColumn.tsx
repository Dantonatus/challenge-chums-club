import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarTaskCard } from './CalendarTaskCard';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/tasks/types';

interface DayColumnProps {
  dateString: string;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  isWeekend: boolean;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onAddTask: (date: string) => void;
}

export function DayColumn({
  dateString,
  dayName,
  dayNumber,
  isToday,
  isWeekend,
  tasks,
  onTaskClick,
  onAddTask,
}: DayColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: dateString,
    data: { date: dateString },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col min-h-[200px] border-r last:border-r-0',
        isWeekend && 'bg-muted/30',
        isOver && 'bg-primary/10',
      )}
    >
      {/* Day header */}
      <div className={cn(
        'p-2 text-center border-b sticky top-0 bg-background z-10',
        isToday && 'bg-primary text-primary-foreground',
      )}>
        <div className="text-xs font-medium uppercase tracking-wide">
          {dayName}
        </div>
        <div className={cn(
          'text-lg font-bold',
          isToday ? 'text-primary-foreground' : 'text-foreground'
        )}>
          {dayNumber}
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-1.5 space-y-1.5 overflow-y-auto">
        {tasks.map((task) => (
          <CalendarTaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
          />
        ))}
        
        {tasks.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onAddTask(dateString)}
              className="text-muted-foreground opacity-0 hover:opacity-100 transition-opacity"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Add button at bottom */}
      {tasks.length > 0 && (
        <div className="p-1.5 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddTask(dateString)}
            className="w-full h-7 text-xs text-muted-foreground"
          >
            <Plus className="h-3 w-3 mr-1" />
            Hinzufügen
          </Button>
        </div>
      )}
    </div>
  );
}