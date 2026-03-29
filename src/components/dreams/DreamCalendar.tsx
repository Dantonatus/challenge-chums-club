import { useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DreamEntry } from '@/lib/dreams/types';
import { format, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { X } from 'lucide-react';

interface Props {
  entries: DreamEntry[];
  selectedDate: Date | null;
  onSelectDate: (date: Date | null) => void;
}

export function DreamCalendar({ entries, selectedDate, onSelectDate }: Props) {
  const datesWithEntries = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.entry_date));
    return Array.from(set).map(d => new Date(d + 'T00:00:00'));
  }, [entries]);

  const countForDate = (date: Date) =>
    entries.filter(e => e.entry_date === format(date, 'yyyy-MM-dd')).length;

  return (
    <Card className="backdrop-blur-xl bg-card/60 border-border/50">
      <CardContent className="pt-4 pb-2">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-medium text-muted-foreground">Kalender</span>
          {selectedDate && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => onSelectDate(null)}
            >
              <X className="w-3 h-3" /> Filter aufheben
            </Button>
          )}
        </div>
        <Calendar
          mode="single"
          selected={selectedDate ?? undefined}
          onSelect={(day) => {
            if (day && selectedDate && isSameDay(day, selectedDate)) {
              onSelectDate(null);
            } else {
              onSelectDate(day ?? null);
            }
          }}
          locale={de}
          showWeekNumber={false}
          className="p-1 pointer-events-auto"
          modifiers={{ hasDream: datesWithEntries }}
          modifiersClassNames={{ hasDream: 'dream-dot' }}
          components={{
            DayContent: ({ date }) => {
              const count = countForDate(date);
              return (
                <div className="relative flex flex-col items-center">
                  <span>{date.getDate()}</span>
                  {count > 0 && (
                    <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_hsl(var(--primary))]" />
                  )}
                </div>
              );
            },
          }}
        />
      </CardContent>
    </Card>
  );
}
