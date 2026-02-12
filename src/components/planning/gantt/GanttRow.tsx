import { GanttTask, WeekColumn } from '@/lib/planning/gantt-types';
import { isoWeekOf } from '@/lib/date';
import { cn } from '@/lib/utils';

interface GanttRowProps {
  task: GanttTask;
  weeks: WeekColumn[];
  clientColor: string;
  onClick: () => void;
}

export function GanttRow({ task, weeks, clientColor, onClick }: GanttRowProps) {
  if (weeks.length === 0) return null;

  const taskStart = new Date(task.start_date);
  const taskEnd = new Date(task.end_date);
  const taskStartWeek = isoWeekOf(taskStart);
  const taskStartYear = taskStart.getFullYear();
  const taskEndWeek = isoWeekOf(taskEnd);
  const taskEndYear = taskEnd.getFullYear();

  // Find column indices
  let startCol = -1;
  let endCol = -1;
  for (let i = 0; i < weeks.length; i++) {
    const w = weeks[i];
    if (startCol === -1 && w.isoWeek === taskStartWeek && w.year === taskStartYear) {
      startCol = i;
    }
    if (w.isoWeek === taskEndWeek && w.year === taskEndYear) {
      endCol = i;
    }
  }

  // Clamp to visible range
  if (startCol === -1) startCol = 0;
  if (endCol === -1) endCol = weeks.length - 1;

  const barColor = task.color || clientColor;

  return (
    <>
      {/* Task name */}
      <div
        className="px-3 py-2.5 text-sm font-medium text-foreground border-b border-r border-border cursor-pointer hover:bg-muted/40 transition-colors truncate"
        onClick={onClick}
        title={task.title}
      >
        <span className={cn(task.is_completed && 'line-through text-muted-foreground')}>
          {task.title}
        </span>
      </div>

      {/* Week cells with bar */}
      {weeks.map((week, i) => {
        const isInRange = i >= startCol && i <= endCol;
        const isStart = i === startCol;
        const isEnd = i === endCol;

        return (
          <div
            key={`${task.id}-${i}`}
            className="relative border-b border-r border-border py-2.5 cursor-pointer hover:bg-muted/20 transition-colors"
            onClick={onClick}
          >
            {isInRange && (
              <div
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-7',
                  isStart ? 'left-1' : 'left-0',
                  isEnd ? 'right-1' : 'right-0',
                  isStart && isEnd && 'rounded-md',
                  isStart && !isEnd && 'rounded-l-md',
                  !isStart && isEnd && 'rounded-r-md',
                )}
                style={{
                  backgroundColor: `${barColor}30`,
                  borderLeft: isStart ? `3px solid ${barColor}` : undefined,
                }}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
