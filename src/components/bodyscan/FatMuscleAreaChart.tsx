import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import type { BodyScan } from '@/lib/bodyscan/types';
import { fatMuscleChartData } from '@/lib/bodyscan/analytics';

interface Props { scans: BodyScan[]; showLabels?: boolean }

export default function FatMuscleAreaChart({ scans, showLabels }: Props) {
  const data = fatMuscleChartData(scans);
  if (data.length < 2) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Körperfett vs. Muskelmasse – Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area yAxisId="left" type="monotone" dataKey="Körperfett %" stroke="hsl(0 60% 55%)" fill="hsl(0 60% 55% / 0.15)" strokeWidth={2}>
              {showLabels && <LabelList dataKey="Körperfett %" position="top" fontSize={9} fill="hsl(0 60% 55%)" fillOpacity={0.6} />}
            </Area>
            <Area yAxisId="right" type="monotone" dataKey="Muskelmasse kg" stroke="hsl(210 70% 55%)" fill="hsl(210 70% 55% / 0.15)" strokeWidth={2}>
              {showLabels && <LabelList dataKey="Muskelmasse kg" position="top" fontSize={9} fill="hsl(210 70% 55%)" fillOpacity={0.6} />}
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
