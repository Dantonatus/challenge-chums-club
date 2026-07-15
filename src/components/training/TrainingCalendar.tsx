import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { TrainingCheckin } from '@/lib/training/types';
import { trainingDatesSet } from '@/lib/training/analytics';
import { parseISO, subMonths } from 'date-fns';

interface Props {
  checkins: TrainingCheckin[];
  anchorDate?: Date;
}

export default function TrainingCalendar({ checkins, anchorDate }: Props) {
  const dates = trainingDatesSet(checkins);
  const highlighted = Array.from(dates).map(d => parseISO(d));
  const anchor = anchorDate ?? new Date();

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Trainingskalender</div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="multiple"
          numberOfMonths={3}
          pagedNavigation
          defaultMonth={subMonths(anchor, 2)}
          selected={highlighted}
          className="rounded-md"
        />
      </CardContent>
    </Card>
  );
}
