import { Calendar } from '@/components/ui/calendar';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { TrainingCheckin } from '@/lib/training/types';
import { trainingDatesSet } from '@/lib/training/analytics';
import { parseISO } from 'date-fns';

interface Props { checkins: TrainingCheckin[] }

export default function TrainingCalendar({ checkins }: Props) {
  const dates = trainingDatesSet(checkins);
  const highlighted = Array.from(dates).map(d => parseISO(d));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Trainingskalender</div>
      </CardHeader>
      <CardContent className="flex justify-center">
        <Calendar
          mode="multiple"
          selected={highlighted}
          className="rounded-md"
        />
      </CardContent>
    </Card>
  );
}
