import { useMemo, useRef, useCallback } from 'react';
import { buildWeekColumns, groupWeeksByMonth, todayPosition } from '@/lib/planning/ganttUtils';
import { GanttTask, PlanningProject, MilestoneWithClient } from '@/lib/planning/types';
import { GanttTaskRow } from './GanttTaskRow';
import { GanttMilestoneDiamond } from './GanttMilestoneDiamond';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface GanttChartProps {
  project: PlanningProject;
  tasks: GanttTask[];
  milestones: MilestoneWithClient[];
  clientColor: string;
  onTaskClick: (task: GanttTask) => void;
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
  onTaskReorder?: (reordered: { id: string; sort_order: number }[]) => void;
}

const LABEL_COL_WIDTH = 280;
const MIN_WEEK_WIDTH = 60;

export function GanttChart({ project, tasks, milestones, clientColor, onTaskClick, onMilestoneClick, onTaskReorder }: GanttChartProps) {
  const timelineRef = useRef<HTMLDivElement>(null);

  const weeks = useMemo(() => {
    const start = new Date(project.start_date);
    let end = project.end_date ? new Date(project.end_date) : new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    for (const t of tasks) {
      const tEnd = new Date(t.end_date);
      if (tEnd > end) end = tEnd;
    }
    end = new Date(end.getTime() + 14 * 24 * 60 * 60 * 1000);
    return buildWeekColumns(start, end);
  }, [project.start_date, project.end_date, tasks]);

  const monthGroups = useMemo(() => groupWeeksByMonth(weeks), [weeks]);
  const todayPos = useMemo(() => todayPosition(weeks), [weeks]);
  const gridWidth = Math.max(weeks.length * MIN_WEEK_WIDTH, 600);

  const taskIds = useMemo(() => tasks.map(t => t.id), [tasks]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !onTaskReorder) return;

    const oldIndex = tasks.findIndex(t => t.id === active.id);
    const newIndex = tasks.findIndex(t => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(tasks, oldIndex, newIndex);
    const updates = reordered.map((t, i) => ({ id: t.id, sort_order: i }));
    onTaskReorder(updates);
  }, [onTaskReorder, tasks]);

  if (weeks.length === 0) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card" id="gantt-chart">
      <ScrollArea className="w-full">
        <div style={{ minWidth: LABEL_COL_WIDTH + gridWidth }}>
          {/* Month header */}
          <div className="flex border-b border-border bg-muted/30">
            <div className="shrink-0 border-r border-border px-3 py-2 text-xs font-semibold text-muted-foreground" style={{ width: LABEL_COL_WIDTH }}>
              Aufgabe
            </div>
            <div className="flex flex-1">
              {monthGroups.map((group, i) => (
                <div
                  key={`${group.year}-${group.month}-${i}`}
                  className="text-center text-xs font-semibold text-foreground py-2 border-r border-border last:border-r-0"
                  style={{ width: `${(group.colSpan / weeks.length) * 100}%` }}
                >
                  {group.label}
                </div>
              ))}
            </div>
          </div>

          {/* KW header */}
          <div className="flex border-b border-border bg-muted/20">
            <div className="shrink-0 border-r border-border" style={{ width: LABEL_COL_WIDTH }} />
            <div className="flex flex-1">
              {weeks.map((week, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] text-muted-foreground py-1 border-r border-border/50 last:border-r-0"
                  style={{ width: `${(1 / weeks.length) * 100}%` }}
                >
                  {week.label}
                </div>
              ))}
            </div>
          </div>

          {/* Task rows */}
          <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]}>
            <div className="relative" ref={timelineRef}>
              {/* Today line */}
              {todayPos !== null && (
                <div
                  className="absolute top-0 bottom-0 w-px bg-primary z-10 pointer-events-none"
                  style={{ left: `calc(${LABEL_COL_WIDTH}px + ${todayPos}% * (100% - ${LABEL_COL_WIDTH}px) / 100)` }}
                >
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[9px] px-1 rounded-b">
                    Heute
                  </div>
                </div>
              )}

              {/* Week grid lines */}
              <div className="absolute inset-0 flex pointer-events-none" style={{ left: LABEL_COL_WIDTH }}>
                {weeks.map((_, i) => (
                  <div
                    key={i}
                    className="border-r border-border/30 h-full"
                    style={{ width: `${(1 / weeks.length) * 100}%` }}
                  />
                ))}
              </div>

              {tasks.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  Noch keine Aufgaben. Erstelle die erste Aufgabe für dieses Projekt.
                </div>
              ) : (
                <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                  {tasks.map((task) => (
                    <GanttTaskRow
                      key={task.id}
                      task={task}
                      weeks={weeks}
                      clientColor={clientColor}
                      labelWidth={LABEL_COL_WIDTH}
                      onClick={() => onTaskClick(task)}
                      milestones={milestones.filter(m => {
                        const mDate = new Date(m.date);
                        const tStart = new Date(task.start_date);
                        const tEnd = new Date(task.end_date);
                        return mDate >= tStart && mDate <= tEnd;
                      })}
                      onMilestoneClick={onMilestoneClick}
                    />
                  ))}
                </SortableContext>
              )}

              {/* Milestones not on any task */}
              {milestones.filter(m => {
                const mDate = new Date(m.date);
                return !tasks.some(t => {
                  const tStart = new Date(t.start_date);
                  const tEnd = new Date(t.end_date);
                  return mDate >= tStart && mDate <= tEnd;
                });
              }).length > 0 && (
                <div className="flex items-center border-t border-border/50 relative" style={{ height: 40 }}>
                  <div className="shrink-0 px-3 text-xs text-muted-foreground truncate border-r border-border" style={{ width: LABEL_COL_WIDTH }}>
                    Meilensteine
                  </div>
                  <div className="relative flex-1 h-full">
                    {milestones.filter(m => {
                      const mDate = new Date(m.date);
                      return !tasks.some(t => {
                        const tStart = new Date(t.start_date);
                        const tEnd = new Date(t.end_date);
                        return mDate >= tStart && mDate <= tEnd;
                      });
                    }).map(ms => (
                      <GanttMilestoneDiamond
                        key={ms.id}
                        milestone={ms}
                        weeks={weeks}
                        onClick={() => onMilestoneClick(ms)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DndContext>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
