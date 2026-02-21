import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { latestValue, weekTrend } from '@/lib/smartscale/analytics';

interface Props {
  entries: SmartScaleEntry[];
}

interface KPIItem {
  label: string;
  field: keyof SmartScaleEntry;
  unit: string;
  decimals: number;
}

const KPIS: KPIItem[] = [
  { label: 'Gewicht', field: 'weight_kg', unit: 'kg', decimals: 1 },
  { label: 'Körperfett', field: 'fat_percent', unit: '%', decimals: 1 },
  { label: 'Muskelmasse', field: 'muscle_mass_kg', unit: 'kg', decimals: 1 },
  { label: 'Wasser', field: 'body_water_percent', unit: '%', decimals: 1 },
  { label: 'Protein', field: 'protein_percent', unit: '%', decimals: 1 },
  { label: 'BMI', field: 'bmi', unit: '', decimals: 1 },
];

export default function ScaleKPIStrip({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
      {KPIS.map(({ label, field, unit, decimals }) => {
        const val = latestValue(entries, field);
        const trend = weekTrend(entries, field);

        return (
          <Card key={field} className="p-3 text-center">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="text-lg font-bold">
              {val !== null ? val.toFixed(decimals) : '—'}
              {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
            </p>
            {trend !== null && (
              <div className={`flex items-center justify-center gap-0.5 text-xs ${
                trend > 0 ? 'text-red-500' : trend < 0 ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                {trend > 0 ? <TrendingUp className="h-3 w-3" /> :
                 trend < 0 ? <TrendingDown className="h-3 w-3" /> :
                 <Minus className="h-3 w-3" />}
                <span>{trend > 0 ? '+' : ''}{trend.toFixed(1)} 7d</span>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
