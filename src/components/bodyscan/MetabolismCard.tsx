import { Card, CardContent } from '@/components/ui/card';
import { Flame, Droplets, Activity } from 'lucide-react';
import type { BodyScan } from '@/lib/bodyscan/types';
import { latestScan } from '@/lib/bodyscan/analytics';

interface Props { scans: BodyScan[] }

export default function MetabolismCard({ scans }: Props) {
  const latest = latestScan(scans);
  if (!latest) return null;

  const items = [
    { label: 'Grundumsatz (BMR)', value: latest.bmr_kcal != null ? `${latest.bmr_kcal} kcal` : '–', icon: Flame },
    { label: 'Wasseranteil', value: latest.tbw_percent != null ? `${latest.tbw_percent} %` : '–', icon: Droplets },
    { label: 'ECW/TBW-Ratio', value: latest.ecw_tbw_ratio != null ? `${latest.ecw_tbw_ratio}` : '–', icon: Activity },
  ];

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Stoffwechsel & Wasserhaushalt</h3>
        <div className="grid grid-cols-3 gap-4">
          {items.map(item => (
            <div key={item.label} className="text-center">
              <item.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
