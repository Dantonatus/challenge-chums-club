import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, ComposedChart } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { TrainingCheckin } from '@/lib/training/types';
import { rollingAvgWeekly } from '@/lib/training/analytics';

interface Props { checkins: TrainingCheckin[] }

export default function FrequencyTrendChart({ checkins }: Props) {
  const data = useMemo(() => rollingAvgWeekly(checkins), [checkins]);
  if (data.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Frequenz-Trend</div>
        <p className="text-xs text-muted-foreground">Besuche pro Woche + gleitender 4-Wochen-Durchschnitt</p>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Bar dataKey="visits" name="Besuche" fill="hsl(var(--primary) / 0.25)" radius={[3, 3, 0, 0]} />
            <Line dataKey="avg" name="Ø 4 Wochen" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
