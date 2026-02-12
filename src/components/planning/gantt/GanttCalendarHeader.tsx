import { WeekColumn, MonthGroup, groupWeeksByMonth } from '@/lib/planning/gantt-types';

interface GanttCalendarHeaderProps {
  weeks: WeekColumn[];
}

export function GanttCalendarHeader({ weeks }: GanttCalendarHeaderProps) {
  const monthGroups = groupWeeksByMonth(weeks);

  return (
    <>
      {/* Month row */}
      <div className="col-span-1" /> {/* Spacer for task name column */}
      {monthGroups.map((group) => (
        <div
          key={group.key}
          className="text-center text-xs font-semibold text-foreground py-2 border-b border-border bg-muted/50"
          style={{ gridColumn: `span ${group.weeks.length}` }}
        >
          {group.label}
        </div>
      ))}

      {/* KW row */}
      <div className="text-xs font-medium text-muted-foreground py-1.5 px-2 border-b border-r border-border bg-muted/30">
        Aufgaben
      </div>
      {weeks.map((week, i) => (
        <div
          key={`kw-${week.isoWeek}-${week.year}-${i}`}
          className="text-center text-[11px] text-muted-foreground py-1.5 border-b border-r border-border bg-muted/30"
        >
          KW {week.isoWeek}
        </div>
      ))}
    </>
  );
}
