import { Activity, TrendingUp, TrendingDown, Minus, Droplets, Dna, BarChart3 } from 'lucide-react';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { latestValue, weekTrend } from '@/lib/smartscale/analytics';
import KPICard, { type KPICardData } from '@/components/weight/KPICard';

interface Props {
  entries: SmartScaleEntry[];
}

export default function ScaleKPIStrip({ entries }: Props) {
  if (entries.length === 0) return null;

  const kpis: {
    label: string;
    field: keyof SmartScaleEntry;
    unit: string;
    decimals: number;
    icon: typeof Activity;
    accent: string;
    calcTitle: string;
    calcText: string;
    calcFormula: string;
  }[] = [
    { label: 'Körperfett', field: 'fat_percent', unit: '%', decimals: 1, icon: Droplets, accent: 'text-rose-400', calcTitle: 'Körperfettanteil', calcText: 'Letzter gemessener Wert der Smart Scale. Trend zeigt die Differenz zum Wert vor ca. 7 Tagen.', calcFormula: 'Δ = latest − closest(t−7d)' },
    { label: 'Muskelmasse', field: 'muscle_mass_kg', unit: 'kg', decimals: 1, icon: Activity, accent: 'text-primary', calcTitle: 'Muskelmasse', calcText: 'Gesamte Muskelmasse in kg. Höhere Werte sind in der Regel besser.', calcFormula: 'Letzter Messwert + 7d-Differenz' },
    { label: 'Skelettmuskel', field: 'skeletal_muscle_percent', unit: '%', decimals: 1, icon: Dna, accent: 'text-primary', calcTitle: 'Skelettmuskelanteil', calcText: 'Anteil der Skelettmuskulatur am Gesamtgewicht.', calcFormula: 'Direktmessung der Smart Scale' },
    { label: 'Wasser', field: 'body_water_percent', unit: '%', decimals: 1, icon: Droplets, accent: 'text-blue-400', calcTitle: 'Körperwasser', calcText: 'Gesamter Wasseranteil im Körper. Optimal sind 50-65% bei Männern.', calcFormula: 'Direktmessung via BIA' },
    { label: 'Protein', field: 'protein_percent', unit: '%', decimals: 1, icon: Dna, accent: 'text-amber-500', calcTitle: 'Proteinanteil', calcText: 'Anteil des Proteins am Körpergewicht.', calcFormula: 'Direktmessung via BIA' },
    { label: 'BMI', field: 'bmi', unit: '', decimals: 1, icon: BarChart3, accent: 'text-muted-foreground', calcTitle: 'Body Mass Index', calcText: 'Verhältnis von Gewicht zu Körpergröße. Begrenzt aussagekräftig bei hoher Muskelmasse.', calcFormula: 'BMI = weight / height²' },
  ];

  const cards: KPICardData[] = kpis.map(k => {
    const val = latestValue(entries, k.field);
    const trend = weekTrend(entries, k.field);
    const TrendIcon = trend !== null && trend > 0 ? TrendingUp : trend !== null && trend < 0 ? TrendingDown : Minus;

    return {
      label: k.label,
      value: val !== null ? `${val.toFixed(k.decimals)}${k.unit ? ' ' + k.unit : ''}` : '—',
      sub: trend !== null ? `${trend > 0 ? '+' : ''}${trend.toFixed(1)} 7d` : 'Kein Trend',
      icon: k.icon,
      accent: k.accent,
      calc: { title: k.calcTitle, text: k.calcText, formula: k.calcFormula },
    };
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(card => (
        <KPICard key={card.label} card={card} />
      ))}
    </div>
  );
}
