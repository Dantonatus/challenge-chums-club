import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Plus, CalendarDays } from 'lucide-react';
import { Quarter, getQuarterLabel, getPreviousQuarter, getNextQuarter, getCurrentQuarter } from '@/lib/planning/types';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface QuarterHeaderProps {
  quarter: Quarter;
  onQuarterChange: (quarter: Quarter) => void;
  onAddClick: () => void;
}

export function QuarterHeader({ quarter, onQuarterChange, onAddClick }: QuarterHeaderProps) {
  const isCurrentQuarter = 
    quarter.year === getCurrentQuarter().year && 
    quarter.quarter === getCurrentQuarter().quarter;

  const monthNames = getMonthRange(quarter);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onQuarterChange(getPreviousQuarter(quarter))}
          aria-label="Vorheriges Quartal"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="text-center min-w-[140px]">
          <h1 className="text-xl font-bold">{getQuarterLabel(quarter)}</h1>
          <p className="text-sm text-muted-foreground">{monthNames}</p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onQuarterChange(getNextQuarter(quarter))}
          aria-label="Nächstes Quartal"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {!isCurrentQuarter && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onQuarterChange(getCurrentQuarter())}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Heute
          </Button>
        )}
        
        <Button onClick={onAddClick} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Meilenstein
        </Button>
      </div>
    </div>
  );
}

function getMonthRange(quarter: Quarter): string {
  const startMonth = (quarter.quarter - 1) * 3;
  const startDate = new Date(quarter.year, startMonth, 1);
  const endDate = new Date(quarter.year, startMonth + 2, 1);
  
  const startName = format(startDate, 'MMM', { locale: de });
  const endName = format(endDate, 'MMM', { locale: de });
  
  return `${startName} – ${endName}`;
}
