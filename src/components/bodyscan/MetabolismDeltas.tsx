import { ChartFrame } from '@/components/health/ChartFrame';
import { cn } from '@/lib/utils';
import type { BodyScan } from '@/lib/bodyscan/types';
import type { ScanDelta } from '@/lib/bodyscan/analytics';
import { compareScans } from '@/lib/bodyscan/analytics';

interface Props {
  current: BodyScan;
  baseline: BodyScan | null;
}

const METABOLISM_KEYS: Array<{
  key: string;
  info: string;
}> = [
  { key: 'bmr_kcal', info: 'Grundumsatz. BIA-basierte Schätzung – abhängig von Hydration, Muskelmasse und Gerätemodell.' },
  { key: 'tbw_percent', info: 'Anteil Gesamtkörperwasser am Gewicht. Schwankt mit Tageszeit, Ernährung und Aktivität.' },
  { key: 'ecw_tbw_ratio', info: 'Verhältnis extrazelluläres zu gesamtem Körperwasser. Reine Messgröße, keine Diagnose.' },
  { key: 'visceral_fat', info: 'TANITA-Skala für viszerales Fett, nicht mit Bildgebung vergleichbar. Nur Trend zeigen.' },
];

function fmt(v: number | null, unit: string): string {
  if (v == null) return '–';
  return `${v.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
}

function signed(v: number | null, unit: string): string {
  if (v == null) return '';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toLocaleString('de-DE', { maximumFractionDigits: 2 })}${unit ? ` ${unit}` : ''}`;
}

export function MetabolismDeltas({ current, baseline }: Props) {
  const deltas: ScanDelta[] = baseline ? compareScans(current, baseline) : [];
  const map = new Map(deltas.map(d => [d.key as string, d]));

  const tiles = METABOLISM_KEYS
    .map(cfg => {
      const d = map.get(cfg.key);
      if (!d || d.current == null) return null;
      return { ...cfg, delta: d };
    })
    .filter((x): x is { key: string; info: string; delta: ScanDelta } => x !== null);

  return (
    <ChartFrame
      eyebrow="Metabolism & Hydration"
      title="Stoffwechsel und Wasserhaushalt"
      caption="Nur ausgewählte BIA-Werte mit Kontext"
      methodology={`BIA-Werte (Bioelektrische Impedanzanalyse) sind Schätzungen und schwanken mit Hydration, Tageszeit und Elektrodenkontakt. Es werden keine geschlechts- oder altersabhängigen Referenzbereiche angezeigt, weil dafür verlässliche Profildaten mit Quelle nötig wären.\n\nDelta bezieht sich auf den oben gewählten Vergleichsscan.`}
    >
      {tiles.length === 0 ? (
        <p className="rounded-xl border border-dashed border-health-hairline bg-health-canvas/30 p-5 text-center text-sm text-health-ink-muted">
          Kein Stoffwechselwert im aktuellen Scan verfügbar.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map(({ key, info, delta }) => (
            <div
              key={key}
              className="rounded-xl border border-health-hairline bg-health-canvas/40 p-4"
            >
              <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-health-ink-subtle">
                {delta.label}
              </div>
              <div className="mt-1 font-health text-xl font-semibold tabular-nums text-health-ink">
                {fmt(delta.current, delta.unit)}
              </div>
              {delta.abs != null ? (
                <div
                  className={cn(
                    'mt-0.5 text-xs tabular-nums',
                    delta.abs > 0 ? 'text-health-warning' : delta.abs < 0 ? 'text-health-positive' : 'text-health-ink-muted',
                  )}
                >
                  {signed(delta.abs, delta.unit)}
                  {delta.pct != null && ` · ${signed(delta.pct, '%')}`}
                </div>
              ) : (
                <div className="mt-0.5 text-xs text-health-ink-subtle">Kein Vergleich möglich</div>
              )}
              <p className="mt-2 text-[10px] leading-relaxed text-health-ink-subtle">{info}</p>
              <div className="mt-2 inline-flex rounded-full border border-health-hairline bg-health-surface px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-health-ink-subtle">
                BIA-Schätzung
              </div>
            </div>
          ))}
        </div>
      )}
    </ChartFrame>
  );
}
