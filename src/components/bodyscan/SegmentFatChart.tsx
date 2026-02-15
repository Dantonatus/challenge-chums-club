import { Card, CardContent } from '@/components/ui/card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LabelList } from 'recharts';
import type { BodyScan } from '@/lib/bodyscan/types';
import { latestScan, previousScan } from '@/lib/bodyscan/analytics';

interface Props { scans: BodyScan[]; showLabels?: boolean }

export default function SegmentFatChart({ scans, showLabels }: Props) {
  const latest = latestScan(scans);
  const prev = previousScan(scans);
  if (!latest?.segments_json) return null;

  const segments = [
    { name: 'Rumpf', key: 'trunk' as const },
    { name: 'Arm L', key: 'armL' as const },
    { name: 'Arm R', key: 'armR' as const },
    { name: 'Bein L', key: 'legL' as const },
    { name: 'Bein R', key: 'legR' as const },
  ];

  const data = segments.map(s => ({
    segment: s.name,
    'Aktuell %': latest.segments_json!.fat[s.key],
    ...(prev?.segments_json ? { 'Vorher %': prev.segments_json.fat[s.key] } : {}),
  }));

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Fettverteilung (%)</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="segment" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
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
              {showLabels && <LabelList dataKey="Aktuell %" position="top" fontSize={9} fill="hsl(0 60% 55%)" fillOpacity={0.6} />}
            </Bar>
            {prev?.segments_json && (
              <Bar dataKey="Vorher %" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]}>
                {showLabels && <LabelList dataKey="Vorher %" position="top" fontSize={9} fill="hsl(var(--muted-foreground))" fillOpacity={0.6} />}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
