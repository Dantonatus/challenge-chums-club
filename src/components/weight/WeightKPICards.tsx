import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity, ArrowDown, ArrowUp, BarChart3, CalendarDays } from 'lucide-react';
import { weeklyChange, volatility, allTimeExtremes, monthlyAverage, trendDirection, movingAverage } from '@/lib/weight/analytics';
import type { WeightEntry } from '@/lib/weight/types';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

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

  const cards = [
    {
      label: 'Aktuell',
      value: `${latest.weight_kg} kg`,
      sub: change !== null ? `${change > 0 ? '+' : ''}${change} kg zur Vorwoche` : 'Keine Vorwoche',
      icon: Activity,
      accent: 'text-primary',
    },
    {
      label: 'Trend (Ø7)',
      value: currentMa !== null ? `${currentMa} kg` : '–',
      sub: trend === 'up' ? 'Steigend' : trend === 'down' ? 'Fallend' : 'Stabil',
      icon: TrendIcon,
      accent: trendColor,
    },
    {
      label: 'Volatilität',
      value: `±${vol} kg`,
      sub: vol < 0.5 ? 'Sehr stabil' : vol < 1 ? 'Normal' : 'Schwankend',
      icon: BarChart3,
      accent: vol < 0.5 ? 'text-emerald-500' : vol < 1 ? 'text-amber-500' : 'text-rose-400',
    },
    {
      label: 'Tiefster Wert',
      value: extremes.min ? `${extremes.min.weight} kg` : '–',
      sub: extremes.min ? format(parseISO(extremes.min.date), 'dd. MMM yy', { locale: de }) : '',
      icon: ArrowDown,
      accent: 'text-emerald-500',
    },
    {
      label: 'Höchster Wert',
      value: extremes.max ? `${extremes.max.weight} kg` : '–',
      sub: extremes.max ? format(parseISO(extremes.max.date), 'dd. MMM yy', { locale: de }) : '',
      icon: ArrowUp,
      accent: 'text-rose-400',
    },
    {
      label: 'Monatl. Schnitt',
      value: avgCurrent !== null ? `${avgCurrent} kg` : '–',
      sub: avgPrev !== null && avgCurrent !== null
        ? `${avgCurrent > avgPrev ? '+' : ''}${Math.round((avgCurrent - avgPrev) * 10) / 10} kg vs. Vormonat`
        : 'Kein Vormonat',
      icon: CalendarDays,
      accent: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map(card => (
        <Card key={card.label} className="overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className={`h-4 w-4 ${card.accent}`} />
              <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{card.sub}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
