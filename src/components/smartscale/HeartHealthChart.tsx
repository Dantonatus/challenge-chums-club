import { useMemo } from 'react';
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Activity } from 'lucide-react';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { latestValue, weekTrend, heartRateZone } from '@/lib/smartscale/analytics';
import KPICard, { type KPICardData } from '@/components/weight/KPICard';

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
  const hrTrend = weekTrend(entries, 'heart_rate_bpm');
  const zone = latestHR !== null ? heartRateZone(latestHR) : null;
  const zoneLabel = zone === 'low' ? 'Niedrig' : zone === 'normal' ? 'Normal' : zone === 'elevated' ? 'Erhöht' : '';

  if (hrEntries.length === 0) return null;

  const kpis: KPICardData[] = [
    {
      label: 'Herzfrequenz',
      value: latestHR !== null ? `${Math.round(latestHR)} bpm` : '—',
      sub: hrTrend !== null ? `${hrTrend > 0 ? '+' : ''}${Math.round(hrTrend)} bpm 7d` : zoneLabel,
      icon: Heart,
      accent: zone === 'normal' ? 'text-emerald-500' : zone === 'elevated' ? 'text-rose-400' : 'text-blue-400',
      calc: { title: 'Ruheherzfrequenz', text: 'Letzter gemessener HR-Wert. Zonen: <60 niedrig, 60-100 normal, >100 erhöht.', formula: 'Direktmessung der Smart Scale' },
    },
    {
      label: 'Herzindex',
      value: latestCI !== null ? `${latestCI.toFixed(1)}` : '—',
      sub: 'L/Min/M²',
      icon: Activity,
      accent: 'text-primary',
      calc: { title: 'Herzindex (Cardiac Index)', text: 'Herzminutenvolumen bezogen auf die Körperoberfläche. Normal: 2.5-4.0 L/min/m².', formula: 'CI = CO / BSA' },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => <KPICard key={k.label} card={k} />)}
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Herz-Kreislauf Verlauf</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pr-4 pb-4">
          <ResponsiveContainer width="100%" height={280}>
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
        </CardContent>
      </Card>
    </div>
  );
}
