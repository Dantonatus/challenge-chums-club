import { GanttTask, MilestoneWithClient, WeekColumn } from '@/lib/planning/types';
import { taskBarPosition } from '@/lib/planning/ganttUtils';
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
}

const ROW_HEIGHT = 56;

export function GanttTaskRow({ task, weeks, clientColor, labelWidth, onClick, milestones, onMilestoneClick }: GanttTaskRowProps) {
  const taskStart = new Date(task.start_date);
  const taskEnd = new Date(task.end_date);
  const bar = taskBarPosition(taskStart, taskEnd, weeks);
  const barColor = task.color || clientColor;

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
      <div className="relative flex-1 h-full" onClick={onClick}>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="absolute top-1/2 -translate-y-1/2 rounded-md transition-shadow group-hover:shadow-md cursor-pointer"
                style={{
                  left: `${bar.left}%`,
                  width: `${bar.width}%`,
                  height: 22,
                  backgroundColor: barColor,
                  opacity: task.is_completed ? 0.5 : 0.8,
                }}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p className="font-semibold">{task.title}</p>
              <p>{format(taskStart, 'dd.MM.yyyy', { locale: de })} – {format(taskEnd, 'dd.MM.yyyy', { locale: de })}</p>
              {task.description && <p className="text-muted-foreground mt-1">{task.description}</p>}
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
