import { useState } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { BodyScan } from '@/lib/bodyscan/types';
import { formatGermanDate, scanComparability } from '@/lib/bodyscan/analytics';

interface Props {
  scans: BodyScan[];
  currentScanId: string;
  baselineScanId: string | null;
  onSetCurrent: (id: string) => void;
  onSetBaseline: (id: string) => void;
}

function coverage(s: BodyScan): number {
  const fields: Array<keyof BodyScan> = [
    'weight_kg', 'fat_mass_kg', 'muscle_mass_kg', 'fat_percent', 'bmi',
    'bmr_kcal', 'tbw_percent', 'visceral_fat', 'segments_json',
  ];
  const present = fields.filter(f => s[f] != null).length;
  return Math.round((present / fields.length) * 100);
}

export function ScanJourneyTimeline({ scans, currentScanId, baselineScanId, onSetCurrent, onSetBaseline }: Props) {
  const [detailScan, setDetailScan] = useState<BodyScan | null>(null);
  const ordered = [...scans].sort((a, b) => a.scan_date.localeCompare(b.scan_date));

  return (
    <ChartFrame
      eyebrow="Scan Journey"
      title="Deine Scans im Zeitverlauf"
      caption="Klick markiert als aktuellen Scan · Rechtsklick oder Doppelklick setzt Baseline"
      methodology={`Die Zeitachse zeigt alle Scans im ausgewählten Zeitraum in chronologischer Reihenfolge. Der Data-Confidence-Indikator berücksichtigt die Vollständigkeit der Kernfelder pro Scan. Für einen belastbaren Vergleich sollten Baseline und aktueller Scan denselben Gerätecode und eine ähnliche Tageszeit haben.`}
    >
      <div className="overflow-x-auto pb-2">
        <div className="relative flex min-w-full items-stretch gap-2">
          {ordered.map((s, i) => {
            const isCurrent = s.id === currentScanId;
            const isBaseline = s.id === baselineScanId;
            const cov = coverage(s);
            const curr = scans.find(x => x.id === currentScanId);
            const cmp = curr && s.id !== curr.id ? scanComparability(curr, s) : null;

            return (
              <div key={s.id} className="flex flex-col items-stretch gap-1.5" style={{ minWidth: 140 }}>
                <button
                  onClick={() => onSetCurrent(s.id)}
                  onDoubleClick={() => onSetBaseline(s.id)}
                  onContextMenu={(e) => { e.preventDefault(); onSetBaseline(s.id); }}
                  className={cn(
                    'group relative flex flex-1 flex-col rounded-xl border p-3 text-left transition-colors',
                    isCurrent
                      ? 'border-health-observed bg-health-observed/5 shadow-sm'
                      : isBaseline
                        ? 'border-health-ink/40 bg-health-canvas/40'
                        : 'border-health-hairline bg-health-canvas/30 hover:border-health-ink/30',
                  )}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.14em]">
                    <span className={cn(isCurrent ? 'text-health-observed' : 'text-health-ink-subtle')}>
                      {isCurrent ? 'Aktuell' : isBaseline ? 'Baseline' : `Scan ${i + 1}`}
                    </span>
                    <ConfidencePill level={cmp?.confidence ?? (cov >= 80 ? 'high' : cov >= 55 ? 'medium' : 'low')} />
                  </div>
                  <div className="text-xs font-semibold text-health-ink">
                    {formatGermanDate(s.scan_date)}
                  </div>
                  <div className="text-[10px] text-health-ink-subtle">{s.scan_time?.slice(0, 5)} · {s.device || 'Gerät ?'}</div>

                  <dl className="mt-2 space-y-0.5 text-[11px] tabular-nums text-health-ink-muted">
                    <MiniStat label="Gewicht" value={s.weight_kg} unit="kg" />
                    <MiniStat label="Muskel" value={s.muscle_mass_kg} unit="kg" />
                    <MiniStat label="Fett" value={s.fat_mass_kg} unit="kg" />
                  </dl>

                  <button
                    onClick={(e) => { e.stopPropagation(); setDetailScan(s); }}
                    className="mt-2 self-start text-[10px] text-health-ink-subtle underline-offset-2 hover:text-health-ink hover:underline"
                  >
                    Rohdaten
                  </button>
                </button>
                {i < ordered.length - 1 && (
                  <div className="mx-auto h-px w-4 bg-health-hairline" aria-hidden />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-[10px] text-health-ink-subtle">
        Data Confidence berücksichtigt Feld-Abdeckung, Gerätegleichheit und Tageszeit-Nähe. Es ist eine
        Vergleichbarkeits-Heuristik, keine wissenschaftliche Sicherheitsangabe.
      </p>

      <Sheet open={!!detailScan} onOpenChange={(o) => !o && setDetailScan(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Rohdaten – {detailScan ? formatGermanDate(detailScan.scan_date) : ''}</SheetTitle>
            <SheetDescription>Alle Messfelder dieses Scans</SheetDescription>
          </SheetHeader>
          {detailScan && (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {(
                [
                  ['Uhrzeit', detailScan.scan_time],
                  ['Gerät', detailScan.device],
                  ['Alter', detailScan.age_years, 'J.'],
                  ['Größe', detailScan.height_cm, 'cm'],
                  ['Gewicht', detailScan.weight_kg, 'kg'],
                  ['BMI', detailScan.bmi],
                  ['Fett %', detailScan.fat_percent, '%'],
                  ['Fettmasse', detailScan.fat_mass_kg, 'kg'],
                  ['Muskelmasse', detailScan.muscle_mass_kg, 'kg'],
                  ['Skelettmuskel', detailScan.skeletal_muscle_mass_kg, 'kg'],
                  ['Knochenmasse', detailScan.bone_mass_kg, 'kg'],
                  ['Metab. Alter', detailScan.metabolic_age, 'J.'],
                  ['TBW', detailScan.tbw_kg, 'kg'],
                  ['TBW %', detailScan.tbw_percent, '%'],
                  ['ECW', detailScan.ecw_kg, 'kg'],
                  ['ICW', detailScan.icw_kg, 'kg'],
                  ['ECW/TBW', detailScan.ecw_tbw_ratio],
                  ['BMR', detailScan.bmr_kcal, 'kcal'],
                  ['Viszeralfett', detailScan.visceral_fat],
                  ['Physique', detailScan.physique_text],
                ] as Array<[string, string | number | null, string?]>
              ).map(([label, val, unit]) => (
                <div key={label} className="flex items-baseline justify-between border-b border-health-hairline/50 py-1">
                  <dt className="text-health-ink-subtle">{label}</dt>
                  <dd className="font-medium tabular-nums text-health-ink">
                    {val != null && val !== '' ? `${val}${unit ? ` ${unit}` : ''}` : '–'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </SheetContent>
      </Sheet>
    </ChartFrame>
  );
}

function MiniStat({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-health-ink-subtle">{label}</dt>
      <dd className="text-health-ink">
        {value != null ? `${value.toLocaleString('de-DE', { maximumFractionDigits: 1 })} ${unit}` : '–'}
      </dd>
    </div>
  );
}

function ConfidencePill({ level }: { level: 'high' | 'medium' | 'low' }) {
  const map = {
    high: { label: 'hoch', cls: 'bg-health-positive/10 text-health-positive' },
    medium: { label: 'mittel', cls: 'bg-health-warning/10 text-health-warning' },
    low: { label: 'niedrig', cls: 'bg-health-ink-subtle/10 text-health-ink-subtle' },
  } as const;
  const m = map[level];
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-medium', m.cls)}>
      {m.label}
    </span>
  );
}
