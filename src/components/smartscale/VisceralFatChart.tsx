import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceArea,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { dailyAverages, latestValue, weekTrend, visceralFatZone } from '@/lib/smartscale/analytics';

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
  const vfZone = latestVF !== null ? visceralFatZone(latestVF) : null;
  const zoneLabel = vfZone === 'healthy' ? 'Gesund' : vfZone === 'elevated' ? 'Erhöht' : vfZone === 'high' ? 'Hoch' : '';
  const zoneColor = vfZone === 'healthy' ? 'text-green-500' : vfZone === 'elevated' ? 'text-yellow-500' : 'text-red-500';

  if (data.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Fettverteilung</h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Bauchfett: </span>
            <span className="font-semibold">{latestVF?.toFixed(1) ?? '—'}</span>
            {vfZone && <span className={`ml-1 ${zoneColor}`}>({zoneLabel})</span>}
          </div>
          <div>
            <span className="text-muted-foreground">Unterhautfett: </span>
            <span className="font-semibold">{latestSF?.toFixed(1) ?? '—'}%</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          {/* Reference zones for visceral fat */}
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
    </Card>
  );
}
