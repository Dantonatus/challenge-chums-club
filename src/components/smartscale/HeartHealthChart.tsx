import { useMemo } from 'react';
import {
  ComposedChart, Line, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { latestValue, heartRateZone } from '@/lib/smartscale/analytics';

interface Props {
  entries: SmartScaleEntry[];
}

export default function HeartHealthChart({ entries }: Props) {
  const hrEntries = useMemo(() =>
    entries.filter(e => e.heart_rate_bpm !== null).map(e => ({
      date: e.measured_at.slice(0, 10),
      label: new Date(e.measured_at).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
      time: e.measured_at.slice(11, 16),
      hr: e.heart_rate_bpm!,
      ci: e.cardiac_index,
    })),
    [entries]
  );

  const latestHR = latestValue(entries, 'heart_rate_bpm');
  const latestCI = latestValue(entries, 'cardiac_index');
  const zone = latestHR !== null ? heartRateZone(latestHR) : null;
  const zoneLabel = zone === 'low' ? 'Niedrig' : zone === 'normal' ? 'Normal' : zone === 'elevated' ? 'Erhöht' : '';
  const zoneColor = zone === 'low' ? 'text-blue-500' : zone === 'normal' ? 'text-green-500' : 'text-red-500';

  if (hrEntries.length === 0) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Herz-Kreislauf</h3>
        <div className="flex gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">HR: </span>
            <span className="font-semibold">{latestHR ?? '—'} bpm</span>
            {zone && <span className={`ml-1 ${zoneColor}`}>({zoneLabel})</span>}
          </div>
          <div>
            <span className="text-muted-foreground">HI: </span>
            <span className="font-semibold">{latestCI?.toFixed(1) ?? '—'}</span>
            <span className="text-muted-foreground ml-0.5">L/Min/M²</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={hrEntries}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
          <YAxis yAxisId="hr" tick={{ fontSize: 10 }} domain={[40, 120]} label={{ value: 'bpm', angle: -90, position: 'insideLeft', style: { fontSize: 10 } }} />
          <YAxis yAxisId="ci" orientation="right" tick={{ fontSize: 10 }} domain={[0, 5]} label={{ value: 'L/Min/M²', angle: 90, position: 'insideRight', style: { fontSize: 10 } }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <ReferenceLine yAxisId="hr" y={60} stroke="hsl(120 60% 50%)" strokeDasharray="3 3" />
          <ReferenceLine yAxisId="hr" y={100} stroke="hsl(0 70% 60%)" strokeDasharray="3 3" />
          <Line yAxisId="hr" type="monotone" dataKey="hr" stroke="hsl(0 70% 60%)" strokeWidth={2} dot={{ r: 3 }} name="Herzfrequenz" />
          <Line yAxisId="ci" type="monotone" dataKey="ci" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} name="Herzindex" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </Card>
  );
}
