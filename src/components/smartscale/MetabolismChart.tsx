import { useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { dailyAverages, latestValue, weekTrend } from '@/lib/smartscale/analytics';

interface Props {
  entries: SmartScaleEntry[];
}

export default function MetabolismChart({ entries }: Props) {
  const data = useMemo(() => {
    const bmrAvg = dailyAverages(entries, 'bmr_kcal');
    const ageAvg = dailyAverages(entries, 'metabolic_age');
    const ageMap = Object.fromEntries(ageAvg.map(d => [d.date, d.avg]));

    return bmrAvg.map(d => ({
      date: d.date,
      label: new Date(d.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      bmr: Math.round(d.avg),
      metaAge: ageMap[d.date] ? Math.round(ageMap[d.date]) : null,
    }));
  }, [entries]);

  const latestBMR = latestValue(entries, 'bmr_kcal');
  const latestAge = latestValue(entries, 'metabolic_age');
  const bmrTrend = weekTrend(entries, 'bmr_kcal');

  if (data.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Stoffwechsel</h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Grundumsatz: </span>
            <span className="font-semibold">{latestBMR ? Math.round(latestBMR) : '—'} kcal</span>
            {bmrTrend !== null && (
              <span className={`ml-1 ${bmrTrend > 0 ? 'text-green-500' : bmrTrend < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                ({bmrTrend > 0 ? '+' : ''}{Math.round(bmrTrend)})
              </span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground">Körperalter: </span>
            <span className="font-semibold">{latestAge ? Math.round(latestAge) : '—'} J.</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="bmr" tick={{ fontSize: 10 }} label={{ value: 'kcal', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
          <YAxis yAxisId="age" orientation="right" tick={{ fontSize: 10 }} domain={[20, 50]} label={{ value: 'Jahre', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line yAxisId="bmr" type="monotone" dataKey="bmr" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Grundumsatz (kcal)" />
          <Bar yAxisId="age" dataKey="metaAge" fill="hsl(var(--muted-foreground))" fillOpacity={0.3} name="Körperalter" barSize={12} />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
