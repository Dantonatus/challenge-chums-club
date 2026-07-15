import { useMemo } from 'react';
import { ChartFrame } from '@/components/health/ChartFrame';
import type { QuadrantPoint } from '@/lib/bodyscan/analytics';
import { formatGermanDate } from '@/lib/bodyscan/analytics';
import type { HealthGoalMode } from '@/hooks/useHealthGoal';

interface Props {
  points: QuadrantPoint[];
  currentScanId: string;
  goalMode: HealthGoalMode | null;
}

function signed(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
}

export function RecompositionQuadrant({ points, currentScanId, goalMode }: Props) {
  const width = 520;
  const height = 380;
  const pad = 40;

  const { xRange, yRange } = useMemo(() => {
    const xs = points.map(p => p.dFat);
    const ys = points.map(p => p.dMuscle);
    const absX = Math.max(0.5, ...xs.map(Math.abs));
    const absY = Math.max(0.5, ...ys.map(Math.abs));
    return {
      xRange: [-absX * 1.15, absX * 1.15] as [number, number],
      yRange: [-absY * 1.15, absY * 1.15] as [number, number],
    };
  }, [points]);

  const toX = (v: number) => pad + ((v - xRange[0]) / (xRange[1] - xRange[0])) * (width - 2 * pad);
  const toY = (v: number) => (height - pad) - ((v - yRange[0]) / (yRange[1] - yRange[0])) * (height - 2 * pad);

  const sorted = [...points].sort((a, b) => a.scan_date.localeCompare(b.scan_date));
  const pathD = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.dFat)} ${toY(p.dMuscle)}`).join(' ');

  // Zielmodus → welcher Quadrant wird hervorgehoben (nur Highlight, keine Wertung)
  const highlightQuadrant: 'ul' | 'ur' | 'll' | 'lr' | null =
    goalMode === 'recomposition' || goalMode === 'weight_loss'
      ? 'ul'   // Fett ↓ (x<0), Muskel ↑ (y>0)
      : goalMode === 'weight_gain'
        ? 'ur'
        : null;

  const quadrants = [
    { id: 'ul', x: 0, y: 0, w: width / 2, h: height / 2, label: 'Muskel ↑ / Fett ↓' },
    { id: 'ur', x: width / 2, y: 0, w: width / 2, h: height / 2, label: 'Muskel ↑ / Fett ↑' },
    { id: 'll', x: 0, y: height / 2, w: width / 2, h: height / 2, label: 'Muskel ↓ / Fett ↓' },
    { id: 'lr', x: width / 2, y: height / 2, w: width / 2, h: height / 2, label: 'Muskel ↓ / Fett ↑' },
  ];

  return (
    <ChartFrame
      eyebrow="Quadrant"
      title="Fett vs. Muskel relativ zum Vergleichsscan"
      caption={points.length ? `${points.length} vergleichbare Scans` : 'Keine vergleichbaren Scans'}
      methodology={`x-Achse: Δ Fettmasse vs. Baseline. y-Achse: Δ Muskelmasse vs. Baseline. Der Pfad zeigt die zeitliche Reihenfolge zwischen den Scans.\n\nDer hervorgehobene Quadrant folgt deinem Zielmodus (nur Highlight, nicht "gut/schlecht"). Ohne Zielmodus wird kein Quadrant priorisiert.`}
    >
      {points.length < 2 ? (
        <p className="rounded-xl border border-dashed border-health-hairline bg-health-canvas/30 p-6 text-center text-sm text-health-ink-muted">
          Für die Quadrant-Ansicht werden mindestens zwei vergleichbare Scans benötigt.
        </p>
      ) : (
        <div>
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
            {quadrants.map(q => (
              <rect
                key={q.id}
                x={q.x}
                y={q.y}
                width={q.w}
                height={q.h}
                fill={q.id === highlightQuadrant ? 'hsl(var(--health-positive))' : 'hsl(var(--health-canvas))'}
                fillOpacity={q.id === highlightQuadrant ? 0.08 : 0.4}
              />
            ))}
            {/* Achsen */}
            <line x1={toX(0)} x2={toX(0)} y1={pad} y2={height - pad} stroke="hsl(var(--health-hairline))" />
            <line x1={pad} x2={width - pad} y1={toY(0)} y2={toY(0)} stroke="hsl(var(--health-hairline))" />

            {/* Achsen-Labels */}
            <text x={width - pad + 4} y={toY(0) + 4} fontSize={10} className="fill-health-ink-subtle">
              Δ Fett →
            </text>
            <text x={toX(0) + 4} y={pad - 8} fontSize={10} className="fill-health-ink-subtle">
              Δ Muskel ↑
            </text>

            {/* Quadranten-Labels */}
            {quadrants.map(q => (
              <text
                key={q.id + 'label'}
                x={q.x + q.w / 2}
                y={q.y + 16}
                textAnchor="middle"
                fontSize={10}
                className="fill-health-ink-subtle"
                fontWeight={q.id === highlightQuadrant ? 600 : 400}
              >
                {q.label}
              </text>
            ))}

            {/* Pfad */}
            <path d={pathD} fill="none" stroke="hsl(var(--health-ink-subtle))" strokeWidth={1.2} strokeDasharray="3 3" />

            {/* Punkte */}
            {sorted.map((p) => {
              const isCurrent = p.scanId === currentScanId;
              const isBaseline = p.isBaseline;
              return (
                <g key={p.scanId}>
                  <circle
                    cx={toX(p.dFat)}
                    cy={toY(p.dMuscle)}
                    r={isCurrent ? 7 : isBaseline ? 5 : 3.5}
                    fill={isCurrent ? 'hsl(var(--health-observed))' : isBaseline ? 'hsl(var(--health-surface))' : 'hsl(var(--health-ink-subtle))'}
                    stroke={isBaseline ? 'hsl(var(--health-ink))' : 'hsl(var(--health-surface))'}
                    strokeWidth={isBaseline ? 1.5 : 1}
                  />
                  {(isCurrent || isBaseline) && (
                    <text
                      x={toX(p.dFat) + 10}
                      y={toY(p.dMuscle) + 4}
                      fontSize={10}
                      className="fill-health-ink"
                    >
                      {isCurrent ? 'Aktuell' : 'Baseline'} · {formatGermanDate(p.scan_date)}
                    </text>
                  )}
                  <title>
                    {formatGermanDate(p.scan_date)}: Δ Fett {signed(p.dFat)} kg, Δ Muskel {signed(p.dMuscle)} kg
                  </title>
                </g>
              );
            })}
          </svg>
          <p className="mt-3 text-[11px] text-health-ink-subtle">
            Punkte relativ zum Vergleichsscan. Hervorgehobener Quadrant orientiert sich am Zielmodus, ohne Bewertung der einzelnen Punkte.
          </p>
        </div>
      )}
    </ChartFrame>
  );
}
