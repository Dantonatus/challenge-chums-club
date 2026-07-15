import { useMemo, useState } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import { cn } from '@/lib/utils';
import AnatomyFigure from '@/components/bodyscan/AnatomyFigure';
import type { BodyScan } from '@/lib/bodyscan/types';
import { segmentSymmetry, type SymmetryPair } from '@/lib/bodyscan/analytics';

interface Props {
  scans: BodyScan[];
  currentScan: BodyScan;
  baseline: BodyScan | null;
}

function signed(n: number, digits = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function AnatomyIntelligence({ scans, currentScan, baseline }: Props) {
  const [mode, setMode] = useState<'muscle' | 'fat'>('muscle');
  const symmetry = useMemo(() => segmentSymmetry(currentScan, mode), [currentScan, mode]);
  const baseSymmetry = useMemo(() => (baseline ? segmentSymmetry(baseline, mode) : null), [baseline, mode]);

  return (
    <ChartFrame
      eyebrow="Anatomy"
      title="Segmentale Verteilung & Symmetrie"
      caption={mode === 'muscle' ? 'Muskelmasse pro Segment' : 'Fettanteil pro Segment'}
      methodology={`Segmentwerte stammen aus der TANITA-BIA-Messung. Farbintensität skaliert relativ zum höchsten Segmentwert im gleichen Körper und dient nur der schnellen Orientierung – sie ist keine absolute Skala.\n\nSymmetrie zeigt die Differenz linkes vs. rechtes Extremitätenpaar. Es handelt sich um einen reinen Messunterschied ohne medizinische Aussage. Belastbare Diagnosen zu Dysbalancen erfordern klinische Diagnostik.`}
      action={
        <div className="inline-flex rounded-full border border-health-hairline bg-health-canvas/60 p-0.5">
          {(['muscle', 'fat'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                mode === m
                  ? 'bg-health-surface text-health-ink shadow-sm'
                  : 'text-health-ink-muted hover:text-health-ink',
              )}
            >
              {m === 'muscle' ? 'Muskel' : 'Fett'}
            </button>
          ))}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl bg-health-canvas/30 p-2">
          <AnatomyFigure
            scans={scans}
            selectedScan={currentScan}
            previousScan={baseline}
          />
        </div>

        <div className="space-y-3">
          <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">
            Symmetrie links vs. rechts
          </div>
          {symmetry ? (
            symmetry.map((s, i) => (
              <SymmetryRow
                key={s.label}
                pair={s}
                basePair={baseSymmetry?.[i] ?? null}
                unit={mode === 'muscle' ? 'kg' : '%'}
              />
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-health-hairline bg-health-canvas/30 p-4 text-xs text-health-ink-muted">
              Segmentdaten für diesen Scan nicht verfügbar.
            </p>
          )}

          <div className="rounded-xl border border-health-hairline bg-health-canvas/30 p-3 text-[11px] leading-relaxed text-health-ink-subtle">
            <div className="mb-1 font-medium text-health-ink-muted">Farb-Legende</div>
            Dunklere Farbe = höherer Wert im Vergleich zum stärksten Segment im gleichen Scan. Kein absoluter
            Bezug, kein Referenzbereich. „Messunterschied“, nicht „Dysbalance“.
          </div>
        </div>
      </div>
    </ChartFrame>
  );
}

function SymmetryRow({
  pair,
  basePair,
  unit,
}: {
  pair: SymmetryPair;
  basePair: SymmetryPair | null;
  unit: string;
}) {
  const asymDelta =
    basePair ? Math.round((pair.pctAsymmetry - basePair.pctAsymmetry) * 10) / 10 : null;
  return (
    <div className="rounded-xl border border-health-hairline bg-health-canvas/40 p-3">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-health-ink">{pair.label}</span>
        <span className="text-xs tabular-nums text-health-ink-muted">
          {pair.pctAsymmetry.toFixed(1)} % Unterschied
          {asymDelta != null && (
            <span className="ml-1.5 text-[10px]">({signed(asymDelta, 1)} pp vs. Baseline)</span>
          )}
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs tabular-nums">
        <div className="text-right text-health-ink">
          <div className="font-medium">{pair.left.toFixed(2)} {unit}</div>
          <div className="text-[10px] text-health-ink-subtle">links</div>
        </div>
        <div className="text-center text-[11px] font-medium text-health-ink-muted">
          Δ {signed(pair.absDiff)} {unit}
        </div>
        <div className="text-left text-health-ink">
          <div className="font-medium">{pair.right.toFixed(2)} {unit}</div>
          <div className="text-[10px] text-health-ink-subtle">rechts</div>
        </div>
      </div>
    </div>
  );
}
