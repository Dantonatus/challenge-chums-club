import { Activity, TrendingUp, TrendingDown, Minus, BarChart3, ArrowDown, ArrowUp, CalendarDays } from 'lucide-react';
import { weeklyChange, volatility, allTimeExtremes, monthlyAverage, trendDirection, movingAverage } from '@/lib/weight/analytics';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import KPICard, { type KPICardData } from './KPICard';

interface Props {
  entries: WeightEntry[];
}

export default function WeightKPICards({ entries }: Props) {
  if (entries.length === 0) return null;

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const change = weeklyChange(entries);
  const trend = trendDirection(entries);
  const vol = volatility(entries, 14);
  const extremes = allTimeExtremes(entries);

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonth = now.getMonth() === 0
    ? `${now.getFullYear() - 1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;
  const avgCurrent = monthlyAverage(entries, currentMonth);
  const avgPrev = monthlyAverage(entries, prevMonth);

  const ma = movingAverage(entries, 7);
  const currentMa = ma.length > 0 ? ma[ma.length - 1].avg : null;

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'down' ? 'text-emerald-500' : trend === 'up' ? 'text-rose-400' : 'text-muted-foreground';

  const cards: KPICardData[] = [
    {
      label: 'Aktuell',
      value: `${latest.weight_kg} kg`,
      sub: change !== null ? `${change > 0 ? '+' : ''}${change} kg zur Vorwoche` : 'Keine Vorwoche',
      icon: Activity,
      accent: 'text-primary',
      calc: {
        title: 'Letzter Eintrag + Wochenvergleich',
        text: 'Zeigt den letzten erfassten Wert. Die Differenz wird zum nächstgelegenen Eintrag vor ca. 7 Tagen berechnet.',
        formula: 'Δ = weight(latest) − weight(closest to t−7d)',
      },
    },
    {
      label: 'Trend (Ø7)',
      value: currentMa !== null ? `${currentMa} kg` : '–',
      sub: trend === 'up' ? 'Steigend' : trend === 'down' ? 'Fallend' : 'Stabil',
      icon: TrendIcon,
      accent: trendColor,
      calc: {
        title: 'Gleitender Durchschnitt (7 Tage)',
        text: 'Durchschnitt der letzten 7 Einträge. Richtung wird aus der Differenz der letzten 3 MA-Werte bestimmt.',
        formula: 'MA(i) = Σ weight[i−6…i] / n\nRichtung: MA[-1] − MA[-3] > ±0.3 kg',
      },
    },
    {
      label: 'Volatilität',
      value: `±${vol} kg`,
      sub: vol < 0.5 ? 'Sehr stabil' : vol < 1 ? 'Normal' : 'Schwankend',
      icon: BarChart3,
      accent: vol < 0.5 ? 'text-emerald-500' : vol < 1 ? 'text-amber-500' : 'text-rose-400',
      calc: {
        title: 'Standardabweichung (14 Tage)',
        text: 'Misst die Streuung deiner letzten 14 Gewichtseinträge um den Mittelwert.',
        formula: 'σ = √( Σ(yᵢ − μ)² / n )\nn = letzte 14 Einträge',
      },
    },
    {
      label: 'Tiefster Wert',
      value: extremes.min ? `${extremes.min.weight} kg` : '–',
      sub: extremes.min ? format(parseISO(extremes.min.date), 'dd. MMM yy', { locale: de }) : '',
      icon: ArrowDown,
      accent: 'text-emerald-500',
      calc: {
        title: 'Allzeit-Minimum',
        text: 'Einfacher linearer Scan über alle erfassten Einträge.',
        formula: 'min(weight_kg) ∀ entries',
      },
    },
    {
      label: 'Höchster Wert',
      value: extremes.max ? `${extremes.max.weight} kg` : '–',
      sub: extremes.max ? format(parseISO(extremes.max.date), 'dd. MMM yy', { locale: de }) : '',
      icon: ArrowUp,
      accent: 'text-rose-400',
      calc: {
        title: 'Allzeit-Maximum',
        text: 'Einfacher linearer Scan über alle erfassten Einträge.',
        formula: 'max(weight_kg) ∀ entries',
      },
    },
    {
      label: 'Monatl. Schnitt',
      value: avgCurrent !== null ? `${avgCurrent} kg` : '–',
      sub: avgPrev !== null && avgCurrent !== null
        ? `${avgCurrent > avgPrev ? '+' : ''}${Math.round((avgCurrent - avgPrev) * 10) / 10} kg vs. Vormonat`
        : 'Kein Vormonat',
      icon: CalendarDays,
      accent: 'text-primary',
      calc: {
        title: 'Monatsdurchschnitt',
        text: 'Durchschnitt aller Einträge im aktuellen Monat. Vergleich zum Vormonat analog berechnet.',
        formula: 'Ø = Σ weight(YYYY-MM) / n\nΔ = Ø(aktuell) − Ø(vormonat)',
      },
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(card => (
        <KPICard key={card.label} card={card} />
      ))}
    </div>
  );
}
