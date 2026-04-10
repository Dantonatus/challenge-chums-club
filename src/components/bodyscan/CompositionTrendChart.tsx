import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import type { BodyScan } from '@/lib/bodyscan/types';
import { compositionChartData, computeTightDomain } from '@/lib/bodyscan/analytics';

interface Props { scans: BodyScan[]; showLabels?: boolean }

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-md text-xs space-y-1">
      <div className="font-semibold text-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium" style={{ color: p.color }}>{p.value} kg</span>
        </div>
      ))}
    </div>
  );
}

export default function CompositionTrendChart({ scans }: Props) {
  const data = useMemo(() => compositionChartData(scans), [scans]);

  const domain = useMemo(() => {
    const vals = data.flatMap(d => [d.Gewicht, d.Muskelmasse, d.Fettmasse]);
    return computeTightDomain(vals, 0.3);
  }, [data]);

  if (data.length < 2) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Körperkomposition – Verlauf</h3>
        <ResponsiveContainer width="100%" height={340}>
          <LineChart data={data} margin={{ top: 20, right: 16, bottom: 0, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={domain}
              tickCount={8}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => `${v} kg`}
              label={{ value: 'kg', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="Gewicht" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Muskelmasse" stroke="hsl(210 70% 55%)" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Fettmasse" stroke="hsl(0 60% 55%)" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
