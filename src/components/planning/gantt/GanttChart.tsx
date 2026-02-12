import { useMemo } from 'react';
import { buildIsoWeeksInRange, isoWeekOf } from '@/lib/date';
import { GanttTask, WeekColumn } from '@/lib/planning/gantt-types';
import { GanttCalendarHeader } from './GanttCalendarHeader';
import { GanttRow } from './GanttRow';
import { GanttMilestones } from './GanttMilestones';
import { MilestoneWithClient } from '@/lib/planning/types';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface GanttChartProps {
  tasks: GanttTask[];
  milestones: MilestoneWithClient[];
  projectStart: string;
  projectEnd: string | null;
  clientColor: string;
  onTaskClick: (task: GanttTask) => void;
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
}

export function GanttChart({
  tasks,
  milestones,
  projectStart,
  projectEnd,
  clientColor,
  onTaskClick,
  onMilestoneClick,
}: GanttChartProps) {
  const weeks = useMemo<WeekColumn[]>(() => {
    const start = new Date(projectStart);
    const end = projectEnd ? new Date(projectEnd) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000); // default 3 months
    return buildIsoWeeksInRange(start, end);
  }, [projectStart, projectEnd]);

  if (weeks.length === 0) return null;

  // Today marker column
  const today = new Date();
  const todayWeek = isoWeekOf(today);
  const todayYear = today.getFullYear();
  const todayCol = weeks.findIndex(w => w.isoWeek === todayWeek && w.year === todayYear);

  const totalCols = weeks.length + 1; // +1 for task name column

  return (
    <ScrollArea className="w-full border border-border rounded-lg bg-card">
      <div
        className="relative min-w-max"
        style={{
          display: 'grid',
          gridTemplateColumns: `200px repeat(${weeks.length}, minmax(60px, 1fr))`,
        }}
      >
        <GanttCalendarHeader weeks={weeks} />

        {tasks.map((task) => (
          <GanttRow
            key={task.id}
            task={task}
            weeks={weeks}
            clientColor={clientColor}
            onClick={() => onTaskClick(task)}
          />
        ))}

        {/* Milestones row */}
        {milestones.length > 0 && (
          <GanttMilestones
            milestones={milestones}
            weeks={weeks}
            onMilestoneClick={onMilestoneClick}
          />
        )}

        {/* Today line */}
        {todayCol >= 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-destructive/60 pointer-events-none z-10"
            style={{
              left: `calc(200px + ${todayCol} * ((100% - 200px) / ${weeks.length}) + ((100% - 200px) / ${weeks.length}) / 2)`,
            }}
          />
        )}

        {/* Empty state */}
        {tasks.length === 0 && (
          <div
            className="text-center text-muted-foreground py-12"
            style={{ gridColumn: `1 / ${totalCols + 1}` }}
          >
            Noch keine Aufgaben. Klicke auf „+ Aufgabe" um zu starten.
          </div>
        )}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
