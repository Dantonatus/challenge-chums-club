import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import type { BodyScan } from '@/lib/bodyscan/types';
import { compositionChartData, computeTightDomain } from '@/lib/bodyscan/analytics';
import { createChartLabel } from './ChartLabel';

interface Props { scans: BodyScan[]; showLabels?: boolean }

export default function CompositionTrendChart({ scans, showLabels }: Props) {
  const data = compositionChartData(scans);
  const labelGewicht = useMemo(() => createChartLabel({ color: 'hsl(var(--primary))', offsetY: -14 }), []);
  const labelMuskel = useMemo(() => createChartLabel({ color: 'hsl(210 70% 55%)', offsetY: -26 }), []);
  const labelFett = useMemo(() => createChartLabel({ color: 'hsl(0 60% 55%)', offsetY: -38 }), []);

  const domainGewicht = useMemo(() => computeTightDomain(data.map(d => d.Gewicht)), [data]);
  const domainMuskel = useMemo(() => computeTightDomain(data.map(d => d.Muskelmasse)), [data]);
  const domainFett = useMemo(() => computeTightDomain(data.map(d => d.Fettmasse)), [data]);

  if (data.length < 2) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Körperkomposition – Verlauf</h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 45 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis yAxisId="gewicht" domain={domainGewicht} tickCount={6} tick={{ fontSize: 11 }} stroke="hsl(var(--primary))" label={{ value: 'kg (Gewicht)', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--primary))' } }} />
            <YAxis yAxisId="muskel" orientation="right" domain={domainMuskel} tickCount={6} tick={{ fontSize: 11 }} stroke="hsl(210 70% 55%)" label={{ value: 'kg (Muskel)', angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'hsl(210 70% 55%)' } }} />
            <YAxis yAxisId="fett" hide domain={domainFett} />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="gewicht" type="monotone" dataKey="Gewicht" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }}>
              {showLabels && <LabelList dataKey="Gewicht" content={labelGewicht} />}
            </Line>
            <Line yAxisId="muskel" type="monotone" dataKey="Muskelmasse" stroke="hsl(210 70% 55%)" strokeWidth={2} dot={{ r: 4 }}>
              {showLabels && <LabelList dataKey="Muskelmasse" content={labelMuskel} />}
            </Line>
            <Line yAxisId="fett" type="monotone" dataKey="Fettmasse" stroke="hsl(0 60% 55%)" strokeWidth={2} dot={{ r: 4 }}>
              {showLabels && <LabelList dataKey="Fettmasse" content={labelFett} />}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
