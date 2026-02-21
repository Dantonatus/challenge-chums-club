import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets, BarChart3 } from 'lucide-react';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { dailyAverages, latestValue, weekTrend, visceralFatZone } from '@/lib/smartscale/analytics';
import KPICard, { type KPICardData } from '@/components/weight/KPICard';

interface Props {
  entries: SmartScaleEntry[];
}

export default function VisceralFatChart({ entries }: Props) {
  const data = useMemo(() => {
    const vfAvg = dailyAverages(entries, 'visceral_fat');
    const sfAvg = dailyAverages(entries, 'subcutaneous_fat_percent');
    const sfMap = Object.fromEntries(sfAvg.map(d => [d.date, d.avg]));

    return vfAvg.map(d => ({
      date: d.date,
      label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      visceral: d.avg,
      subcutaneous: sfMap[d.date] ?? null,
    }));
  }, [entries]);

  const latestVF = latestValue(entries, 'visceral_fat');
  const latestSF = latestValue(entries, 'subcutaneous_fat_percent');
  const latestFP = latestValue(entries, 'fat_percent');
  const vfZone = latestVF !== null ? visceralFatZone(latestVF) : null;
  const zoneLabel = vfZone === 'healthy' ? 'Gesund' : vfZone === 'elevated' ? 'Erhöht' : vfZone === 'high' ? 'Hoch' : '';
  const zoneAccent = vfZone === 'healthy' ? 'text-emerald-500' : vfZone === 'elevated' ? 'text-amber-500' : 'text-rose-400';

  if (data.length === 0) return null;

  const kpis: KPICardData[] = [
    {
      label: 'Viszeralfett',
      value: latestVF !== null ? `${latestVF.toFixed(1)}` : '—',
      sub: zoneLabel,
      icon: Droplets,
      accent: zoneAccent,
      calc: { title: 'Viszeralfett-Rating', text: 'Bewertung des Bauchfetts. ≤9 gesund, 10-14 erhöht, ≥15 hoch.', formula: 'Rating-Skala der Smart Scale' },
    },
    {
      label: 'Unterhautfett',
      value: latestSF !== null ? `${latestSF.toFixed(1)} %` : '—',
      sub: weekTrend(entries, 'subcutaneous_fat_percent') !== null
        ? `${weekTrend(entries, 'subcutaneous_fat_percent')! > 0 ? '+' : ''}${weekTrend(entries, 'subcutaneous_fat_percent')!.toFixed(1)} 7d`
        : 'Kein Trend',
      icon: Droplets,
      accent: 'text-primary',
      calc: { title: 'Subkutanes Fett', text: 'Fettanteil unter der Haut.', formula: 'Direktmessung via BIA' },
    },
    {
      label: 'Körperfett',
      value: latestFP !== null ? `${latestFP.toFixed(1)} %` : '—',
      sub: weekTrend(entries, 'fat_percent') !== null
        ? `${weekTrend(entries, 'fat_percent')! > 0 ? '+' : ''}${weekTrend(entries, 'fat_percent')!.toFixed(1)} 7d`
        : 'Kein Trend',
      icon: BarChart3,
      accent: 'text-rose-400',
      calc: { title: 'Gesamtkörperfett', text: 'Gesamter Körperfettanteil in Prozent.', formula: 'Direktmessung via BIA' },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {kpis.map(k => <KPICard key={k.label} card={k} />)}
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Fettverteilung</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pr-4 pb-4">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <ReferenceArea yAxisId="vf" y1={0} y2={9} fill="hsl(120 60% 50%)" fillOpacity={0.08} />
              <ReferenceArea yAxisId="vf" y1={9} y2={14} fill="hsl(45 80% 55%)" fillOpacity={0.08} />
              <ReferenceArea yAxisId="vf" y1={14} y2={30} fill="hsl(0 70% 60%)" fillOpacity={0.08} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="vf" tick={{ fontSize: 10 }} domain={[0, 20]} label={{ value: 'Rating', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
              <YAxis yAxisId="sf" orientation="right" tick={{ fontSize: 10 }} unit="%" label={{ value: 'Unterhaut %', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Line yAxisId="vf" type="monotone" dataKey="visceral" stroke="hsl(0 70% 60%)" strokeWidth={2} dot={{ r: 3 }} name="Viszeralfett" />
              <Line yAxisId="sf" type="monotone" dataKey="subcutaneous" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} name="Unterhautfett" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
