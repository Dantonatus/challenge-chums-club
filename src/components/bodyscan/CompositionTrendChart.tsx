import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
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

const sharedMargin = { top: 8, right: 16, bottom: 0, left: 8 };

export default function CompositionTrendChart({ scans }: Props) {
  const data = useMemo(() => compositionChartData(scans), [scans]);

  const upperDomain = useMemo(() => {
    const vals = data.flatMap(d => [d.Gewicht, d.Muskelmasse]);
    return computeTightDomain(vals, 0.3);
  }, [data]);

  const lowerDomain = useMemo(() => {
    const vals = data.map(d => d.Fettmasse);
    return computeTightDomain(vals, 0.3);
  }, [data]);

  if (data.length < 2) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Körperkomposition – Verlauf</h3>

        {/* Upper chart: Gewicht + Muskelmasse */}
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={sharedMargin} syncId="composition">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" hide />
            <YAxis
              domain={upperDomain}
              tickCount={6}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => `${v} kg`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Gewicht" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Muskelmasse" stroke="hsl(210 70% 55%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>

        {/* Lower chart: Fettmasse */}
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={data} margin={sharedMargin} syncId="composition">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              domain={lowerDomain}
              tickCount={5}
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              tickFormatter={(v: number) => `${v} kg`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="Fettmasse" stroke="hsl(0 60% 55%)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mt-2 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: 'hsl(var(--primary))' }} />Gewicht</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: 'hsl(210 70% 55%)' }} />Muskelmasse</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: 'hsl(0 60% 55%)' }} />Fettmasse</span>
        </div>
      </CardContent>
    </Card>
  );
}
