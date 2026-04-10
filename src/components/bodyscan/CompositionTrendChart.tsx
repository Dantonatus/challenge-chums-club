import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from 'recharts';
import type { BodyScan } from '@/lib/bodyscan/types';
import { compositionChangeData, computeTightDomain } from '@/lib/bodyscan/analytics';

interface Props { scans: BodyScan[]; showLabels?: boolean }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-xs space-y-1">
      <div className="font-semibold text-foreground">{label}</div>
      {payload.map((p: any) => {
        const name = p.dataKey as string;
        const absKey = name.includes('Gewicht') ? 'absGewicht' : name.includes('Muskel') ? 'absMuskel' : 'absFett';
        const abs = p.payload[absKey];
        const sign = p.value > 0 ? '+' : '';
        return (
          <div key={name} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{name.replace(' %', '')}:</span>
            <span className="font-medium" style={{ color: p.color }}>{sign}{p.value}%</span>
            <span className="text-muted-foreground">({abs != null ? `${abs} kg` : '–'})</span>
          </div>
        );
      })}
    </div>
  );
}

export default function CompositionTrendChart({ scans }: Props) {
  const data = useMemo(() => compositionChangeData(scans), [scans]);
  const allVals = useMemo(() => data.flatMap(d => [d['Gewicht %'], d['Muskelmasse %'], d['Fettmasse %']]), [data]);
  const domain = useMemo(() => computeTightDomain(allVals, 0.3), [allVals]);

  if (data.length < 2) return null;

  const refDate = scans[0]?.scan_date;
  const formatRef = refDate ? refDate.split('-').reverse().join('.') : '';

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-0.5">Körperkomposition – Verlauf</h3>
        <p className="text-xs text-muted-foreground mb-4">Veränderung in % relativ zum ersten Scan ({formatRef})</p>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={domain}
              tickCount={8}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => `${v > 0 ? '+' : ''}${v}%`}
              label={{ value: 'Veränderung %', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Gewicht %" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Muskelmasse %" stroke="hsl(210 70% 55%)" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Fettmasse %" stroke="hsl(0 60% 55%)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
