import { useState } from 'react';
import { format, startOfWeek, isToday } from 'date-fns';
import { de } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WeekHeaderProps {
  weekLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
  currentWeekStart: Date;
}

export function WeekHeader({ 
  weekLabel, 
  onPrevWeek, 
  onNextWeek, 
  onToday,
  currentWeekStart,
}: WeekHeaderProps) {
  const todayWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isCurrentWeek = format(currentWeekStart, 'yyyy-MM-dd') === format(todayWeekStart, 'yyyy-MM-dd');

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">{weekLabel}</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          disabled={isCurrentWeek}
          className={cn(
            'text-sm',
            isCurrentWeek && 'opacity-50'
          )}
        >
          Heute
        </Button>
        
        <div className="flex items-center border rounded-lg">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrevWeek}
            className="h-8 w-8 rounded-r-none"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNextWeek}
            className="h-8 w-8 rounded-l-none"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}