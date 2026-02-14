import { Card, CardContent } from '@/components/ui/card';
import { Scale, Percent, Dumbbell, Activity, Heart, Shield } from 'lucide-react';
import type { BodyScan } from '@/lib/bodyscan/types';
import { latestScan, trendDiff, formatTrend } from '@/lib/bodyscan/analytics';

interface Props { scans: BodyScan[] }

export default function BodyScanKPICards({ scans }: Props) {
  const latest = latestScan(scans);
  if (!latest) return null;

  const kpis = [
    {
      label: 'Gewicht',
      value: latest.weight_kg != null ? `${latest.weight_kg} kg` : '–',
      sub: formatTrend(trendDiff(scans, 'weight_kg', true), ' kg vs. Start'),
      icon: Scale,
    },
    {
      label: 'Körperfett',
      value: latest.fat_percent != null ? `${latest.fat_percent} %` : '–',
      sub: formatTrend(trendDiff(scans, 'fat_percent'), ' % vs. vorher'),
      icon: Percent,
    },
    {
      label: 'Muskelmasse',
      value: latest.muscle_mass_kg != null ? `${latest.muscle_mass_kg} kg` : '–',
      sub: formatTrend(trendDiff(scans, 'muscle_mass_kg'), ' kg vs. vorher'),
      icon: Dumbbell,
    },
    {
      label: 'BMI',
      value: latest.bmi != null ? `${latest.bmi}` : '–',
      sub: latest.bmi != null
        ? latest.bmi < 18.5 ? 'Untergewicht' : latest.bmi < 25 ? 'Normalgewicht' : latest.bmi < 30 ? 'Übergewicht' : 'Adipositas'
        : undefined,
      icon: Activity,
    },
    {
      label: 'Metabolisches Alter',
      value: latest.metabolic_age != null ? `${latest.metabolic_age} J.` : '–',
      sub: latest.age_years != null && latest.metabolic_age != null
        ? `Echtes Alter: ${latest.age_years} J.`
        : undefined,
      icon: Heart,
    },
    {
      label: 'Viszeralfett',
      value: latest.visceral_fat != null ? `${latest.visceral_fat}` : '–',
      sub: latest.visceral_fat != null
        ? latest.visceral_fat <= 12 ? 'Gesund' : 'Erhöht'
        : undefined,
      icon: Shield,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map(k => (
        <Card key={k.label}>
          <CardContent className="p-4 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <k.icon className="h-3.5 w-3.5" /> {k.label}
            </div>
            <div className="text-2xl font-bold">{k.value}</div>
            {k.sub && <div className="text-xs text-muted-foreground">{k.sub}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
