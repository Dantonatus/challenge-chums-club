import { Card, CardContent } from '@/components/ui/card';
import { Scale, Percent, Dumbbell, Activity, Heart, Shield } from 'lucide-react';
import type { BodyScan } from '@/lib/bodyscan/types';
import { latestScan, trendDiff, formatTrend } from '@/lib/bodyscan/analytics';

interface Props {
  scans: BodyScan[];
  selectedScan?: BodyScan | null;
}

export default function BodyScanKPICards({ scans, selectedScan }: Props) {
  const scan = selectedScan ?? latestScan(scans);
  if (!scan) return null;

  const kpis = [
    {
      label: 'Gewicht',
      value: scan.weight_kg != null ? `${scan.weight_kg} kg` : '–',
      sub: formatTrend(trendDiff(scans, 'weight_kg', true), ' kg vs. Start'),
      icon: Scale,
    },
    {
      label: 'Körperfett',
      value: scan.fat_percent != null ? `${scan.fat_percent} %` : '–',
      sub: formatTrend(trendDiff(scans, 'fat_percent'), ' % vs. vorher'),
      icon: Percent,
    },
    {
      label: 'Muskelmasse',
      value: scan.muscle_mass_kg != null ? `${scan.muscle_mass_kg} kg` : '–',
      sub: formatTrend(trendDiff(scans, 'muscle_mass_kg'), ' kg vs. vorher'),
      icon: Dumbbell,
    },
    {
      label: 'BMI',
      value: scan.bmi != null ? `${scan.bmi}` : '–',
      sub: scan.bmi != null
        ? scan.bmi < 18.5 ? 'Untergewicht' : scan.bmi < 25 ? 'Normalgewicht' : scan.bmi < 30 ? 'Übergewicht' : 'Adipositas'
        : undefined,
      icon: Activity,
    },
    {
      label: 'Metabolisches Alter',
      value: scan.metabolic_age != null ? `${scan.metabolic_age} J.` : '–',
      sub: scan.age_years != null && scan.metabolic_age != null
        ? `Echtes Alter: ${scan.age_years} J.`
        : undefined,
      icon: Heart,
    },
    {
      label: 'Viszeralfett',
      value: scan.visceral_fat != null ? `${scan.visceral_fat}` : '–',
      sub: scan.visceral_fat != null
        ? scan.visceral_fat <= 12 ? 'Gesund' : 'Erhöht'
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
