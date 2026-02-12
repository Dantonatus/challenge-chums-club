import { useState, useCallback, useRef } from 'react';
import { GanttTask, MilestoneWithClient, WeekColumn } from '@/lib/planning/types';
import { taskBarPosition, pixelsToDays, shiftDates } from '@/lib/planning/ganttUtils';
import { GanttMilestoneDiamond } from './GanttMilestoneDiamond';
import { Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GanttTaskRowProps {
  task: GanttTask;
  weeks: WeekColumn[];
  clientColor: string;
  labelWidth: number;
  onClick: () => void;
  milestones: MilestoneWithClient[];
  onMilestoneClick: (m: MilestoneWithClient) => void;
  onTaskDragEnd?: (taskId: string, newStart: string, newEnd: string) => void;
}

const ROW_HEIGHT = 56;

export function GanttTaskRow({ task, weeks, clientColor, labelWidth, onClick, milestones, onMilestoneClick, onTaskDragEnd }: GanttTaskRowProps) {
  const taskStart = new Date(task.start_date);
  const taskEnd = new Date(task.end_date);
  const bar = taskBarPosition(taskStart, taskEnd, weeks);
  const barColor = task.color || clientColor;

  // Horizontal drag state
  const [deltaX, setDeltaX] = useState(0);
  const isDraggingH = useRef(false);
  const startXRef = useRef(0);
  const timelineWidthRef = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isDraggingH.current = true;
    startXRef.current = e.clientX;
    // Measure the timeline container width
    const timelineEl = (e.currentTarget as HTMLElement).parentElement;
    timelineWidthRef.current = timelineEl?.clientWidth || 1;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingH.current) return;
    e.stopPropagation();
    setDeltaX(e.clientX - startXRef.current);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingH.current) return;
    e.stopPropagation();
    isDraggingH.current = false;
    const finalDelta = e.clientX - startXRef.current;
    setDeltaX(0);

    if (Math.abs(finalDelta) < 5) return; // ignore tiny moves

    const days = pixelsToDays(finalDelta, timelineWidthRef.current, weeks);
    if (days === 0) return;

    const { start_date, end_date } = shiftDates(task.start_date, task.end_date, days);
    onTaskDragEnd?.(task.id, start_date, end_date);
  }, [weeks, task, onTaskDragEnd]);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
    height: ROW_HEIGHT,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center border-b border-border/40 hover:bg-muted/20 transition-colors group ${isDragging ? 'bg-muted/40 shadow-lg rounded-md' : ''}`}
    >
      {/* Label – drag handle for vertical reorder */}
      <div
        className="shrink-0 px-3 text-xs font-medium border-r border-border flex items-center gap-2 cursor-grab active:cursor-grabbing select-none"
        style={{ width: labelWidth }}
        {...attributes}
        {...listeners}
      >
        {task.is_completed && (
          <span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Check className="w-2.5 h-2.5 text-primary-foreground" />
          </span>
        )}
        <span className={`line-clamp-2 ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
          {task.title}
        </span>
      </div>

      {/* Timeline area */}
      <div className="relative flex-1 h-full" onClick={deltaX === 0 ? onClick : undefined}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-md transition-shadow group-hover:shadow-md"
                style={{
                  left: `${bar.left}%`,
                  width: `${bar.width}%`,
                  height: 22,
                  backgroundColor: barColor,
                  opacity: task.is_completed ? 0.5 : 0.8,
                  transform: `translateX(${deltaX}px)`,
                  cursor: 'ew-resize',
                  transition: isDraggingH.current ? 'none' : undefined,
                }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-semibold">{task.title}</p>
              <p>{format(taskStart, 'dd.MM.yyyy', { locale: de })} – {format(taskEnd, 'dd.MM.yyyy', { locale: de })}</p>
              {task.description && <p className="text-muted-foreground mt-1 max-w-[200px] line-clamp-2">{task.description}</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {milestones.map(ms => (
          <GanttMilestoneDiamond
            key={ms.id}
            milestone={ms}
            weeks={weeks}
            onClick={() => onMilestoneClick(ms)}
          />
        ))}
      </div>
    </div>
  );
}
