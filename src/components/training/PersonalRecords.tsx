import { useMemo } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Sunrise, Moon, Trophy, Calendar } from 'lucide-react';
import type { TrainingCheckin } from '@/lib/training/types';
import { personalRecords } from '@/lib/training/analytics';

interface Props { checkins: TrainingCheckin[] }

export default function PersonalRecords({ checkins }: Props) {
  const records = useMemo(() => personalRecords(checkins), [checkins]);
  if (!records.earliestCheckin) return null;

  const items = [
    {
      icon: Sunrise,
      label: 'Frühester Check-in',
      value: records.earliestCheckin?.time,
      sub: records.earliestCheckin?.date,
    },
    {
      icon: Moon,
      label: 'Spätester Check-in',
      value: records.latestCheckin?.time,
      sub: records.latestCheckin?.date,
    },
    {
      icon: Trophy,
      label: 'Aktivster Tag',
      value: records.busiestDay ? `${records.busiestDay.count}× Check-in` : '–',
      sub: records.busiestDay?.date,
    },
    {
      icon: Calendar,
      label: 'Längste Pause',
      value: records.longestBreak ? `${records.longestBreak.days} Tage` : '–',
      sub: records.longestBreak ? `${records.longestBreak.from} → ${records.longestBreak.to}` : undefined,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Persönliche Rekorde</div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(item => (
            <div key={item.label} className="flex flex-col gap-1 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <item.icon className="h-4 w-4" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
              <div className="text-xl font-bold">{item.value}</div>
              {item.sub && <div className="text-xs text-muted-foreground truncate">{item.sub}</div>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
