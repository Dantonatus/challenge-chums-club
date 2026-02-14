import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import type { TrainingCheckin } from '@/lib/training/types';
import { weeklyVisits } from '@/lib/training/analytics';

interface Props { checkins: TrainingCheckin[] }

export default function WeeklyVisitsChart({ checkins }: Props) {
  const data = weeklyVisits(checkins);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-lg font-semibold">Besuche pro Woche</div>
      </CardHeader>
      <CardContent className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="week" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip contentStyle={{ borderRadius: 8 }} />
            <Bar dataKey="visits" name="Besuche" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
