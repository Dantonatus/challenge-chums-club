import { useMemo } from 'react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame, Activity } from 'lucide-react';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { dailyAverages, latestValue, weekTrend } from '@/lib/smartscale/analytics';
import KPICard, { type KPICardData } from '@/components/weight/KPICard';

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

  const kpis: KPICardData[] = [
    {
      label: 'Grundumsatz',
      value: latestBMR ? `${Math.round(latestBMR)} kcal` : '—',
      sub: bmrTrend !== null ? `${bmrTrend > 0 ? '+' : ''}${Math.round(bmrTrend)} kcal 7d` : 'Kein Trend',
      icon: Flame,
      accent: 'text-amber-500',
      calc: { title: 'Grundumsatz (BMR)', text: 'Kalorienverbrauch in Ruhe. Höher = mehr Kalorienverbrauch ohne Aktivität.', formula: 'Direktmessung via BIA + Alter/Geschlecht' },
    },
    {
      label: 'Körperalter',
      value: latestAge ? `${Math.round(latestAge)} Jahre` : '—',
      sub: 'Metabolisches Alter',
      icon: Activity,
      accent: 'text-primary',
      calc: { title: 'Metabolisches Alter', text: 'Vergleicht deinen Grundumsatz mit Durchschnittswerten nach Altersgruppe. Niedriger als das echte Alter = guter Stoffwechsel.', formula: 'BMR-Vergleich mit Alters-Referenzdaten' },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {kpis.map(k => <KPICard key={k.label} card={k} />)}
      </div>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Stoffwechsel Verlauf</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pr-4 pb-4">
          <ResponsiveContainer width="100%" height={280}>
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
        </CardContent>
      </Card>
    </div>
  );
}
