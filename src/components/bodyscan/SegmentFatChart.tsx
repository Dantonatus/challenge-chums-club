import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import type { BodyScan } from '@/lib/bodyscan/types';
import { latestScan, previousScan, computeTightDomain } from '@/lib/bodyscan/analytics';
import { createChartLabel } from './ChartLabel';

interface Props { scans: BodyScan[]; showLabels?: boolean }

function DeltaBarLabel(props: any) {
  const { x, y, width, value } = props;
  if (value == null || x == null || y == null) return null;
  const num = Number(value);
  if (isNaN(num) || num === 0) return null;
  const sign = num > 0 ? '+' : '';
  const text = `${sign}${num.toFixed(1)}%`;
  const fill = num < 0 ? 'hsl(142 71% 45%)' : 'hsl(0 60% 55%)'; // less fat = green
  return (
    <text x={x + width / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight={600} fill={fill}>
      {text}
    </text>
  );
}

export default function SegmentFatChart({ scans, showLabels }: Props) {
  const latest = latestScan(scans);
  const prev = previousScan(scans);
  const labelCurrent = useMemo(() => createChartLabel({ color: 'hsl(0 60% 55%)', offsetY: -16 }), []);
  const labelPrev = useMemo(() => createChartLabel({ color: 'hsl(var(--muted-foreground))', offsetY: -16 }), []);
  if (!latest?.segments_json) return null;

  const segments = [
    { name: 'Rumpf', key: 'trunk' as const },
    { name: 'Arm L', key: 'armL' as const },
    { name: 'Arm R', key: 'armR' as const },
    { name: 'Bein L', key: 'legL' as const },
    { name: 'Bein R', key: 'legR' as const },
  ];

  const data = segments.map(s => {
    const cur = latest.segments_json!.fat[s.key];
    const prevVal = prev?.segments_json?.fat[s.key];
    return {
      segment: s.name,
      'Aktuell %': cur,
      ...(prevVal != null ? { 'Vorher %': prevVal } : {}),
      delta: prevVal != null ? Math.round((cur - prevVal) * 100) / 100 : null,
    };
  });

  const allVals = data.flatMap(d => [d['Aktuell %'], d['Vorher %']].filter((v): v is number => v != null));
  const domain = computeTightDomain(allVals, 0.2);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Fettverteilung (%)</h3>
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={data} margin={{ top: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="segment" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis domain={domain} tickCount={6} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Aktuell %" fill="hsl(0 60% 55%)" radius={[4, 4, 0, 0]}>
              {showLabels && <LabelList dataKey="Aktuell %" content={labelCurrent} />}
              {prev?.segments_json && <LabelList dataKey="delta" content={DeltaBarLabel} />}
            </Bar>
            {prev?.segments_json && (
              <Bar dataKey="Vorher %" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]}>
                {showLabels && <LabelList dataKey="Vorher %" content={labelPrev} />}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
