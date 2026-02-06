import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Quarter, getQuarterMonths, MilestoneWithClient } from '@/lib/planning/types';
import { MilestoneCard } from './MilestoneCard';
import { format, isSameMonth, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface MonthViewProps {
  quarter: Quarter;
  milestones: MilestoneWithClient[];
  onMilestoneClick: (milestone: MilestoneWithClient) => void;
}

export function MonthView({ quarter, milestones, onMilestoneClick }: MonthViewProps) {
  const months = getQuarterMonths(quarter);
  const [monthIndex, setMonthIndex] = useState(() => {
    // Start with current month if in quarter, otherwise first month
    const currentMonth = new Date().getMonth();
    const idx = months.indexOf(currentMonth);
    return idx >= 0 ? idx : 0;
  });

  const currentMonthDate = new Date(quarter.year, months[monthIndex], 1);

  const monthMilestones = useMemo(() => {
    return milestones
      .filter(m => isSameMonth(new Date(m.date), currentMonthDate))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [milestones, currentMonthDate]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: { date: Date; items: MilestoneWithClient[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: MilestoneWithClient[] = [];

    monthMilestones.forEach(m => {
      const mDate = new Date(m.date);
      if (!currentDate || !isSameDay(currentDate, mDate)) {
        if (currentGroup.length > 0 && currentDate) {
          groups.push({ date: currentDate, items: currentGroup });
        }
        currentDate = mDate;
        currentGroup = [m];
      } else {
        currentGroup.push(m);
      }
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, items: currentGroup });
    }

    return groups;
  }, [monthMilestones]);

  const canGoPrev = monthIndex > 0;
  const canGoNext = monthIndex < 2;

  return (
    <div className="space-y-4">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthIndex(i => i - 1)}
          disabled={!canGoPrev}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="text-lg font-semibold">
          {format(currentMonthDate, 'MMMM yyyy', { locale: de })}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonthIndex(i => i + 1)}
          disabled={!canGoNext}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Milestones list */}
      {monthMilestones.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Keine Meilensteine in diesem Monat
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(({ date, items }) => (
            <div key={date.toISOString()}>
              <div className="flex items-center gap-3 mb-2">
                <div className={cn(
                  "text-2xl font-bold",
                  isSameDay(date, new Date()) && "text-primary"
                )}>
                  {format(date, 'd')}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(date, 'EEEE', { locale: de })}
                </div>
                {isSameDay(date, new Date()) && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    Heute
                  </span>
                )}
              </div>
              <div className="space-y-2 ml-10">
                {items.map(milestone => (
                  <MilestoneCard
                    key={milestone.id}
                    milestone={milestone}
                    onClick={() => onMilestoneClick(milestone)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
