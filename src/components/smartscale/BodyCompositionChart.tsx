import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { dailyAverages } from '@/lib/smartscale/analytics';

interface Props {
  entries: SmartScaleEntry[];
}

export default function BodyCompositionChart({ entries }: Props) {
  const data = useMemo(() => {
    const fatAvg = dailyAverages(entries, 'fat_percent');
    const muscleAvg = dailyAverages(entries, 'skeletal_muscle_percent');
    const waterAvg = dailyAverages(entries, 'body_water_percent');
    const proteinAvg = dailyAverages(entries, 'protein_percent');

    const dates = new Set([
      ...fatAvg.map(d => d.date),
      ...muscleAvg.map(d => d.date),
      ...waterAvg.map(d => d.date),
      ...proteinAvg.map(d => d.date),
    ]);

    const fatMap = Object.fromEntries(fatAvg.map(d => [d.date, d.avg]));
    const muscleMap = Object.fromEntries(muscleAvg.map(d => [d.date, d.avg]));
    const waterMap = Object.fromEntries(waterAvg.map(d => [d.date, d.avg]));
    const proteinMap = Object.fromEntries(proteinAvg.map(d => [d.date, d.avg]));

    return [...dates].sort().map(date => ({
      date,
      label: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      fat: fatMap[date] ?? null,
      muscle: muscleMap[date] ?? null,
      water: waterMap[date] ?? null,
      protein: proteinMap[date] ?? null,
    }));
  }, [entries]);

  if (data.length === 0) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Körperzusammensetzung</h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} unit="%" />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number, name: string) => {
              const labels: Record<string, string> = {
                fat: 'Körperfett', muscle: 'Skelettmuskel', water: 'Wasser', protein: 'Protein',
              };
              return [`${value}%`, labels[name] || name];
            }}
          />
          <Area type="monotone" dataKey="muscle" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.6} name="muscle" />
          <Area type="monotone" dataKey="fat" stackId="1" fill="hsl(0 70% 60%)" stroke="hsl(0 70% 60%)" fillOpacity={0.5} name="fat" />
          <Area type="monotone" dataKey="water" stackId="1" fill="hsl(200 70% 60%)" stroke="hsl(200 70% 60%)" fillOpacity={0.4} name="water" />
          <Area type="monotone" dataKey="protein" stackId="1" fill="hsl(45 70% 55%)" stroke="hsl(45 70% 55%)" fillOpacity={0.4} name="protein" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
