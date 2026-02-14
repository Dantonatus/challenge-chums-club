import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { TrainingCheckin } from '@/lib/training/types';
import { weekdayDistribution } from '@/lib/training/analytics';

interface Props { checkins: TrainingCheckin[] }

export default function WeekdayHeatmap({ checkins }: Props) {
  const data = weekdayDistribution(checkins);
  const max = Math.max(...data.map(d => d.visits), 1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Wochentags-Verteilung</div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 justify-between">
          {data.map(d => {
            const intensity = d.visits / max;
            return (
              <div key={d.day} className="flex flex-col items-center gap-2 flex-1">
                <div
                  className="w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-colors"
                  style={{
                    backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.8})`,
                    color: intensity > 0.5 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
                  }}
                >
                  {d.visits}
                </div>
                <span className="text-xs text-muted-foreground font-medium">{d.day}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
