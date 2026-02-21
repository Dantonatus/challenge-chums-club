import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import type { BodyScan } from '@/lib/bodyscan/types';

interface Props {
  scans: BodyScan[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

export default function ScanTimeline({ scans, selectedIndex, onSelectIndex }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const reversed = [...scans].reverse();

  if (scans.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-4">Scan-Übersicht ({scans.length} Scans)</h3>
        <div className="space-y-2">
          {reversed.map((scan, revIdx) => {
            const isExpanded = expandedId === scan.id;
            const originalIndex = scans.length - 1 - revIdx;
            const isSelected = selectedIndex !== undefined && originalIndex === selectedIndex;
            return (
              <div
                key={scan.id}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                }`}
                onClick={() => {
                  if (onSelectIndex) onSelectIndex(originalIndex);
                  setExpandedId(isExpanded ? null : scan.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{scan.scan_date}</span>
                    <span className="text-xs text-muted-foreground">{scan.scan_time} Uhr</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {scan.weight_kg} kg · {scan.fat_percent}% Fett · {scan.muscle_mass_kg} kg Muskel
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Detail label="BMI" value={scan.bmi} />
                    <Detail label="Fettmasse" value={scan.fat_mass_kg} unit="kg" />
                    <Detail label="Knochenmasse" value={scan.bone_mass_kg} unit="kg" />
                    <Detail label="Metabol. Alter" value={scan.metabolic_age} unit="J." />
                    <Detail label="BMR" value={scan.bmr_kcal} unit="kcal" />
                    <Detail label="Wasser" value={scan.tbw_percent} unit="%" />
                    <Detail label="ECW/TBW" value={scan.ecw_tbw_ratio} />
                    <Detail label="Viszeralfett" value={scan.visceral_fat} />
                    <Detail label="Physique" value={scan.physique_text} />
                    <Detail label="Gerät" value={scan.device} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function Detail({ label, value, unit }: { label: string; value: any; unit?: string }) {
  return (
    <div>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">{value != null ? `${value}${unit ? ` ${unit}` : ''}` : '–'}</div>
    </div>
  );
}
