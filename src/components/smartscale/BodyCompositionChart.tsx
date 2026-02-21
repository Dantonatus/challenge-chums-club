import { useMemo } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceArea, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { dailyAverages, dailyMassBreakdown } from '@/lib/smartscale/analytics';

interface Props {
  entries: SmartScaleEntry[];
}

const MASS_LABELS: Record<string, string> = {
  fatKg: 'Fettmasse',
  muscleKg: 'Muskelmasse',
  boneKg: 'Knochenmasse',
};

const PCT_LABELS: Record<string, string> = {
  fat: 'Körperfett',
  muscle: 'Skelettmuskel',
  water: 'Wasser',
  protein: 'Protein',
};

export default function BodyCompositionChart({ entries }: Props) {
  // Stacked mass data (kg)
  const massData = useMemo(() => dailyMassBreakdown(entries), [entries]);

  // Independent percent lines
  const pctData = useMemo(() => {
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

    const toMap = (arr: { date: string; avg: number }[]) => Object.fromEntries(arr.map(d => [d.date, d.avg]));
    const fatMap = toMap(fatAvg);
    const muscleMap = toMap(muscleAvg);
    const waterMap = toMap(waterAvg);
    const proteinMap = toMap(proteinAvg);

    return [...dates].sort().map(date => ({
      date,
      label: new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      fat: fatMap[date] ?? null,
      muscle: muscleMap[date] ?? null,
      water: waterMap[date] ?? null,
      protein: proteinMap[date] ?? null,
    }));
  }, [entries]);

  if (massData.length === 0 && pctData.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Chart A: Body mass breakdown (kg, stacked) */}
      {massData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Körpermasse-Aufteilung (kg)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pr-4 pb-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={massData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit=" kg" />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value} kg`, MASS_LABELS[name] || name]}
                />
                <Legend formatter={(value: string) => MASS_LABELS[value] || value} />
                <Area type="monotone" dataKey="muscleKg" stackId="1" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.6} name="muscleKg" />
                <Area type="monotone" dataKey="fatKg" stackId="1" fill="hsl(0 70% 60%)" stroke="hsl(0 70% 60%)" fillOpacity={0.5} name="fatKg" />
                <Area type="monotone" dataKey="boneKg" stackId="1" fill="hsl(45 50% 65%)" stroke="hsl(45 50% 65%)" fillOpacity={0.5} name="boneKg" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Chart B: Percent metrics as independent lines with reference bands */}
      {pctData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Körperanalyse-Metriken (%)</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pr-4 pb-4">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={pctData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                {/* Reference bands for healthy ranges */}
                <ReferenceArea y1={10} y2={20} fill="hsl(0 70% 60%)" fillOpacity={0.08} label={{ value: '', position: 'insideTopLeft' }} />
                <ReferenceArea y1={40} y2={60} fill="hsl(var(--primary))" fillOpacity={0.06} />
                <ReferenceArea y1={50} y2={65} fill="hsl(200 70% 60%)" fillOpacity={0.06} />
                <ReferenceArea y1={16} y2={20} fill="hsl(45 70% 55%)" fillOpacity={0.08} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="%" domain={[0, 70]} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value}%`, PCT_LABELS[name] || name]}
                />
                <Legend formatter={(value: string) => PCT_LABELS[value] || value} />
                <Line type="monotone" dataKey="fat" stroke="hsl(0 70% 60%)" strokeWidth={2} dot={{ r: 3 }} name="fat" connectNulls />
                <Line type="monotone" dataKey="muscle" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="muscle" connectNulls />
                <Line type="monotone" dataKey="water" stroke="hsl(200 70% 60%)" strokeWidth={2} dot={{ r: 3 }} name="water" connectNulls />
                <Line type="monotone" dataKey="protein" stroke="hsl(45 70% 55%)" strokeWidth={2} dot={{ r: 3 }} name="protein" connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
