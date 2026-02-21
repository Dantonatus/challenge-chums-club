import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Sun, Moon, ArrowDown, ArrowUp } from 'lucide-react';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import { morningVsEvening } from '@/lib/smartscale/analytics';

interface Props {
  entries: SmartScaleEntry[];
}

export default function DailyComparisonCard({ entries }: Props) {
  const comparison = useMemo(() => {
    if (entries.length === 0) return null;
    // Get latest date
    const latestDate = entries[entries.length - 1].measured_at.slice(0, 10);
    const result = morningVsEvening(entries, latestDate, 'weight_kg');
    if (result.morning === null || result.evening === null) return null;
    return { ...result, date: latestDate, diff: Math.round((result.evening - result.morning) * 100) / 100 };
  }, [entries]);

  if (!comparison) return null;

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold mb-3">Tagesvergleich Gewicht</h3>
      <p className="text-xs text-muted-foreground mb-2">
        {new Date(comparison.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
      </p>
      <div className="flex items-center justify-around">
        <div className="text-center">
          <Sun className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
          <p className="text-xs text-muted-foreground">Morgens</p>
          <p className="text-lg font-bold">{comparison.morning!.toFixed(1)} kg</p>
        </div>
        <div className="text-center">
          <div className={`flex items-center gap-1 text-sm font-semibold ${comparison.diff > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {comparison.diff > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            {comparison.diff > 0 ? '+' : ''}{comparison.diff.toFixed(2)} kg
          </div>
        </div>
        <div className="text-center">
          <Moon className="h-5 w-5 mx-auto text-blue-400 mb-1" />
          <p className="text-xs text-muted-foreground">Abends</p>
          <p className="text-lg font-bold">{comparison.evening!.toFixed(1)} kg</p>
        </div>
      </div>
    </Card>
  );
}
