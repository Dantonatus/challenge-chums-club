import { WeekColumn } from '@/lib/planning/gantt-types';
import { MilestoneWithClient, MILESTONE_TYPE_CONFIG } from '@/lib/planning/types';
import { isoWeekOf } from '@/lib/date';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface GanttMilestonesProps {
  milestones: MilestoneWithClient[];
  weeks: WeekColumn[];
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
}

export function GanttMilestones({ milestones, weeks, onMilestoneClick }: GanttMilestonesProps) {
  return (
    <>
      <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-r border-border bg-muted/20">
        Meilensteine
      </div>
      {weeks.map((week, i) => {
        const weekMilestones = milestones.filter((m) => {
          const mDate = new Date(m.date);
          return isoWeekOf(mDate) === week.isoWeek && mDate.getFullYear() === week.year;
        });

        return (
          <div
            key={`ms-${i}`}
            className="relative border-b border-r border-border py-2 flex items-center justify-center gap-1"
          >
            {weekMilestones.map((m) => {
              const config = MILESTONE_TYPE_CONFIG[m.milestone_type as keyof typeof MILESTONE_TYPE_CONFIG] || MILESTONE_TYPE_CONFIG.general;
              return (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onMilestoneClick(m)}
                      className="w-4 h-4 rotate-45 hover:scale-125 transition-transform"
                      style={{ backgroundColor: config.color }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(m.date), 'dd. MMM yyyy', { locale: de })}
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        );
      })}
    </>
  );
}
