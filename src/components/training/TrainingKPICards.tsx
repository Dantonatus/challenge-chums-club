import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, TrendingUp, Clock, Flame, Calendar } from 'lucide-react';
import type { TrainingCheckin } from '@/lib/training/types';
import {
  longestStreak, currentStreak, visitsThisMonth, visitsLastMonth,
  avgVisitsPerWeek, mostCommonTimeBucket,
} from '@/lib/training/analytics';

interface Props { checkins: TrainingCheckin[] }

export default function TrainingKPICards({ checkins }: Props) {
  const thisMonth = visitsThisMonth(checkins);
  const lastMonth = visitsLastMonth(checkins);
  const diff = thisMonth - lastMonth;

  const kpis = [
    { label: 'Gesamt-Besuche', value: checkins.length, icon: Dumbbell },
    { label: 'Diesen Monat', value: `${thisMonth}`, sub: diff !== 0 ? `${diff > 0 ? '+' : ''}${diff} vs. letzter Monat` : undefined, icon: Calendar },
    { label: 'Ø pro Woche', value: avgVisitsPerWeek(checkins), icon: TrendingUp },
    { label: 'Längste Streak', value: `${longestStreak(checkins)} Tage`, icon: Flame },
    { label: 'Aktuelle Streak', value: `${currentStreak(checkins)} Tage`, icon: Flame },
    { label: 'Lieblings-Zeit', value: mostCommonTimeBucket(checkins), icon: Clock },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map(k => (
        <Card key={k.label}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </div>
            <div className="text-2xl font-bold">{k.value}</div>
            {k.sub && <div className="text-xs text-muted-foreground">{k.sub}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
