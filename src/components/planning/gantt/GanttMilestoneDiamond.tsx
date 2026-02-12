import { MilestoneWithClient, WeekColumn, MILESTONE_TYPE_CONFIG, MilestoneType } from '@/lib/planning/types';
import { dateToPosition } from '@/lib/planning/ganttUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface GanttMilestoneDiamondProps {
  milestone: MilestoneWithClient;
  weeks: WeekColumn[];
  onClick: () => void;
}

export function GanttMilestoneDiamond({ milestone, weeks, onClick }: GanttMilestoneDiamondProps) {
  const mDate = new Date(milestone.date);
  const pos = dateToPosition(mDate, weeks) * 100;
  const config = MILESTONE_TYPE_CONFIG[milestone.milestone_type as MilestoneType] || MILESTONE_TYPE_CONFIG.general;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 cursor-pointer hover:scale-125 transition-transform"
            style={{ left: `${pos}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <div
              className="w-3 h-3 rotate-45 border-2 border-background shadow-sm"
              style={{ backgroundColor: config.color }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <p className="font-semibold">{milestone.title}</p>
          <p>{format(mDate, 'dd.MM.yyyy', { locale: de })} · {config.labelDe}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
