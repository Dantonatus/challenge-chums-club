import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BodyScan, BodyScanSegments } from '@/lib/bodyscan/types';
import { latestScan, previousScan } from '@/lib/bodyscan/analytics';

type Mode = 'muscle' | 'fat';

/* ─── Apple-Health Color Tokens ─── */

const APPLE = {
  muscle: 'hsl(215, 60%, 58%)',
  muscleSoft: 'hsl(215, 50%, 68%)',
  fat: 'hsl(12, 55%, 58%)',
  fatSoft: 'hsl(12, 45%, 68%)',
  good: 'hsl(142, 71%, 45%)',
  bad: 'hsl(0, 100%, 60%)',
};

/* ─── Segment Info Card ─── */

function SegmentCard({
  label,
  value,
  unit,
  intensity,
  diff,
  mode,
  delay,
  isHighest,
}: {
  label: string;
  value: number;
  unit: string;
  intensity: number;
  diff: number | null;
  mode: Mode;
  delay: number;
  isHighest: boolean;
  side: 'left' | 'right' | 'center';
}) {
  const diffPositive = diff != null && diff > 0;
  const diffNegative = diff != null && diff < 0;
  const isGood = mode === 'muscle' ? diffPositive : diffNegative;
  const isBad = mode === 'muscle' ? diffNegative : diffPositive;

  const barColor = mode === 'muscle' ? APPLE.muscle : APPLE.fat;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 160, damping: 22, delay }}
      className={`
        relative rounded-2xl p-5
        bg-card/80 backdrop-blur-xl
        transition-shadow duration-300
        ${isHighest
          ? 'shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(255,255,255,0.04)]'
          : 'shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(255,255,255,0.02)]'
        }
      `}
    >
      <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium mb-1.5">
        {label}
      </p>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">
          {(value ?? 0).toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{unit}</span>
      </div>

      {/* Ultra-thin progress bar */}
      <div className="h-[3px] w-full rounded-full bg-muted/40 overflow-hidden mb-2.5">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(intensity * 100)}%` }}
          transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1], delay: delay + 0.15 }}
        />
      </div>

      {/* Diff */}
      {diff != null && (
        <p
          className={`text-[12px] font-medium tabular-nums ${
            isGood
              ? 'text-[hsl(142,71%,45%)]'
              : isBad
              ? 'text-[hsl(0,100%,60%)]'
              : 'text-muted-foreground'
          }`}
        >
          {isGood ? '↑ ' : isBad ? '↓ ' : ''}
          {diff > 0 ? '+' : ''}
          {diff.toFixed(2)} {unit}
        </p>
      )}
    </motion.div>
  );
}

/* ─── SVG Silhouette – Anatomically refined, single flowing body ─── */

/**
 * ViewBox 0 0 200 440. One continuous outline. Segment overlays clip to the body.
 * Proportions follow ~7.5 head canon for a modern, athletic figure.
 */
const BODY_OUTLINE =
  // Head
  'M100 18 C112 18 122 28 122 41 C122 51 116 59 108 63 ' +
  // Neck to shoulders
  'L108 71 C108 74 111 76 115 78 ' +
  // Right shoulder → arm outer
  'C128 80 142 84 152 92 C160 99 166 110 170 124 ' +
  'L176 156 C178 172 178 188 176 202 C174 214 170 224 166 232 ' +
  'C164 236 160 236 158 232 C156 226 155 218 154 210 ' +
  'L150 186 C148 174 145 164 141 154 ' +
  // Right torso taper to waist
  'L138 148 C140 162 141 176 141 190 L142 214 ' +
  // Right hip
  'C142 222 143 230 145 240 ' +
  // Right leg outer
  'L152 292 C154 316 154 340 152 364 L149 396 ' +
  'C148 410 147 420 146 426 C145 431 141 432 138 429 ' +
  'C135 425 133 418 132 410 L128 378 ' +
  'C126 358 124 338 122 318 L118 280 ' +
  // Right inner thigh up to crotch
  'C117 268 115 258 112 250 L108 244 ' +
  // Crotch
  'C105 242 102 241 100 241 C98 241 95 242 92 244 ' +
  // Left inner thigh down
  'L88 250 C85 258 83 268 82 280 L78 318 ' +
  'C76 338 74 358 72 378 L68 410 C67 418 65 425 62 429 ' +
  'C59 432 55 431 54 426 C53 420 52 410 51 396 L48 364 ' +
  'C46 340 46 316 48 292 L55 240 ' +
  // Left hip
  'C57 230 58 222 58 214 L59 190 C59 176 60 162 62 148 ' +
  // Left torso to waist
  'L59 154 C55 164 52 174 50 186 L46 210 ' +
  'C45 218 44 226 42 232 C40 236 36 236 34 232 ' +
  'C30 224 26 214 24 202 C22 188 22 172 24 156 ' +
  'L30 124 C34 110 40 99 48 92 C58 84 72 80 85 78 ' +
  'C89 76 92 74 92 71 L92 63 ' +
  // Left face back to head start
  'C84 59 78 51 78 41 C78 28 88 18 100 18 Z';

/** Anatomical zone overlays – each clipped to BODY_OUTLINE via clipPath */
const ZONE_PATHS = {
  // Chest + abs block
  trunk:
    'M64 82 C60 96 58 112 58 130 L58 168 C58 190 62 208 68 224 ' +
    'C78 232 92 236 100 236 C108 236 122 232 132 224 ' +
    'C138 208 142 190 142 168 L142 130 C142 112 140 96 136 82 Z',
  // Left arm (viewer's left = anatomical right)
  armL: 'M22 92 L48 82 L58 130 L52 190 L42 232 L26 232 L18 200 L18 150 Z',
  armR: 'M178 92 L152 82 L142 130 L148 190 L158 232 L174 232 L182 200 L182 150 Z',
  legL: 'M52 240 L92 240 L88 300 L82 380 L70 432 L52 432 L46 380 L48 320 Z',
  legR: 'M148 240 L108 240 L112 300 L118 380 L130 432 L148 432 L154 380 L152 320 Z',
};

/** Anchor points on body for connector lines from cards */
export const BODY_ANCHORS = {
  armL: { x: 32, y: 150 },
  armR: { x: 168, y: 150 },
  trunk: { x: 100, y: 160 },
  legL: { x: 72, y: 320 },
  legR: { x: 128, y: 320 },
};

function BodySilhouette({
  mode,
  segments,
  maxVal,
  highestKey,
}: {
  mode: Mode;
  segments: Record<string, number>;
  maxVal: number;
  highestKey: string;
}) {
  const baseColor = mode === 'muscle' ? APPLE.muscle : APPLE.fat;
  const softColor = mode === 'muscle' ? APPLE.muscleSoft : APPLE.fatSoft;

  const zoneKeys = ['trunk', 'armL', 'armR', 'legL', 'legR'] as const;

  // Symmetry deltas
  const armAsym = Math.abs((segments.armL || 0) - (segments.armR || 0));
  const legAsym = Math.abs((segments.legL || 0) - (segments.legR || 0));
  const armMean = ((segments.armL || 0) + (segments.armR || 0)) / 2 || 1;
  const legMean = ((segments.legL || 0) + (segments.legR || 0)) / 2 || 1;
  const armAsymPct = (armAsym / armMean) * 100;
  const legAsymPct = (legAsym / legMean) * 100;

  return (
    <motion.svg
      viewBox="0 0 200 460"
      className="w-full h-full mx-auto drop-shadow-[0_10px_30px_rgba(0,0,0,0.08)] dark:drop-shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1] }}
    >
      <defs>
        {/* Body base fill – subtle vertical gradient for depth */}
        <linearGradient id="body-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.06" />
          <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.12" />
        </linearGradient>

        {/* Body inner shading (creates volume) */}
        <radialGradient id="body-volume" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0.08" />
        </radialGradient>

        {/* Per-zone heat gradients */}
        {zoneKeys.map((key) => {
          const intensity = (segments[key] || 0) / maxVal;
          const opacity = 0.25 + 0.65 * intensity;
          return (
            <radialGradient
              key={`grad-${key}-${mode}`}
              id={`zone-${key}`}
              cx="50%"
              cy="50%"
              r="70%"
            >
              <stop offset="0%" stopColor={softColor} stopOpacity={opacity} />
              <stop offset="60%" stopColor={baseColor} stopOpacity={opacity * 0.8} />
              <stop offset="100%" stopColor={baseColor} stopOpacity={opacity * 0.15} />
            </radialGradient>
          );
        })}

        {/* Glow filter for highest segment */}
        <filter id="zone-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Clip path so zone overlays never bleed outside body */}
        <clipPath id="body-clip">
          <path d={BODY_OUTLINE} />
        </clipPath>
      </defs>

      {/* 1. Body silhouette base fill */}
      <path d={BODY_OUTLINE} fill="url(#body-base)" />

      {/* 2. Zone heat overlays (clipped to body) */}
      <g clipPath="url(#body-clip)">
        <AnimatePresence mode="wait">
          {zoneKeys.map((key, i) => {
            const isHighest = key === highestKey;
            return (
              <motion.path
                key={`${key}-${mode}`}
                d={ZONE_PATHS[key]}
                fill={`url(#zone-${key})`}
                filter={isHighest ? 'url(#zone-glow)' : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 0.55,
                  delay: i * 0.06,
                  ease: [0.32, 0.72, 0, 1],
                }}
              />
            );
          })}
        </AnimatePresence>

        {/* Volume shading on top */}
        <path d={BODY_OUTLINE} fill="url(#body-volume)" pointerEvents="none" />
      </g>

      {/* 3. Outline stroke – crisp anatomical line */}
      <path
        d={BODY_OUTLINE}
        fill="none"
        stroke="hsl(var(--foreground))"
        strokeOpacity="0.28"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* 4. Center line – subtle spine cue */}
      <line
        x1="100"
        y1="78"
        x2="100"
        y2="240"
        stroke="hsl(var(--foreground))"
        strokeOpacity="0.08"
        strokeWidth="0.8"
        strokeDasharray="2 3"
      />

      {/* 5. Symmetry indicator arcs */}
      {armAsymPct > 5 && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.6 }}
        >
          <text
            x="100"
            y="120"
            textAnchor="middle"
            fontSize="7"
            fill="hsl(var(--muted-foreground))"
            className="font-medium tracking-wide"
          >
            Δ {armAsymPct.toFixed(0)}% Arme
          </text>
        </motion.g>
      )}
      {legAsymPct > 5 && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 0.7 }}
        >
          <text
            x="100"
            y="340"
            textAnchor="middle"
            fontSize="7"
            fill="hsl(var(--muted-foreground))"
            className="font-medium tracking-wide"
          >
            Δ {legAsymPct.toFixed(0)}% Beine
          </text>
        </motion.g>
      )}

      {/* 6. Pulse ring on highest zone anchor */}
      {highestKey && BODY_ANCHORS[highestKey as keyof typeof BODY_ANCHORS] && (
        <motion.circle
          cx={BODY_ANCHORS[highestKey as keyof typeof BODY_ANCHORS].x}
          cy={BODY_ANCHORS[highestKey as keyof typeof BODY_ANCHORS].y}
          r="6"
          fill="none"
          stroke={baseColor}
          strokeWidth="1.5"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 2.6 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
    </motion.svg>
  );
}

/* ─── Segment Labels ─── */

const SEGMENT_LABELS: Record<string, string> = {
  trunk: 'Rumpf',
  armL: 'Linker Arm',
  armR: 'Rechter Arm',
  legL: 'Linkes Bein',
  legR: 'Rechtes Bein',
};

/* ─── Main Component ─── */

export default function AnatomyFigure({
  scans,
  selectedScan,
  previousScan: previousScanProp,
}: {
  scans: BodyScan[];
  selectedScan?: BodyScan | null;
  previousScan?: BodyScan | null;
}) {
  const [mode, setMode] = useState<Mode>('muscle');
  const isMobile = useIsMobile();

  const latest = selectedScan ?? latestScan(scans);
  const previous = previousScanProp !== undefined ? previousScanProp : previousScan(scans);

  const segments = latest?.segments_json;
  const prevSegments = previous?.segments_json;

  const { values, maxVal, highestKey, diffs } = useMemo(() => {
    if (!segments) return { values: null, maxVal: 0, highestKey: '', diffs: null };
    const src = mode === 'muscle' ? segments.muscle : segments.fat;
    const vals: Record<string, number> = {
      trunk: src.trunk,
      armL: src.armL,
      armR: src.armR,
      legL: src.legL,
      legR: src.legR,
    };
    const m = Math.max(...Object.values(vals)) || 1;
    const hKey = (Object.entries(vals) as [string, number][]).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0];

    let d: Record<string, number> | null = null;
    if (prevSegments) {
      const curr = mode === 'muscle' ? segments.muscle : segments.fat;
      const prev = mode === 'muscle' ? prevSegments.muscle : prevSegments.fat;
      d = {
        trunk: Math.round((curr.trunk - prev.trunk) * 100) / 100,
        armL: Math.round((curr.armL - prev.armL) * 100) / 100,
        armR: Math.round((curr.armR - prev.armR) * 100) / 100,
        legL: Math.round((curr.legL - prev.legL) * 100) / 100,
        legR: Math.round((curr.legR - prev.legR) * 100) / 100,
      };
    }

    return { values: vals, maxVal: m, highestKey: hKey, diffs: d };
  }, [segments, prevSegments, mode]);

  if (!segments || !values) return null;

  const unit = mode === 'muscle' ? 'kg' : '%';

  const makeCard = (key: string, side: 'left' | 'right' | 'center', delay: number) => (
    <SegmentCard
      key={`${key}-${mode}`}
      label={SEGMENT_LABELS[key]}
      value={values[key]}
      unit={unit}
      intensity={values[key] / maxVal}
      diff={diffs?.[key] ?? null}
      mode={mode}
      delay={delay}
      isHighest={key === highestKey}
      side={side}
    />
  );

  return (
    <Card className="overflow-hidden border-0 shadow-[0_2px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_20px_rgba(255,255,255,0.03)]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold tracking-tight">Körperanalyse</CardTitle>

          {/* Apple-style segmented control */}
          <div className="relative flex items-center bg-muted/60 rounded-xl p-[3px]">
            {(['muscle', 'fat'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="relative z-10 px-4 py-1.5 text-[13px] font-medium rounded-[10px] transition-colors duration-200"
                style={{
                  color: mode === m ? 'var(--foreground)' : 'hsl(var(--muted-foreground))',
                }}
              >
                {m === 'muscle' ? 'Muskel' : 'Fett'}
                {mode === m && (
                  <motion.div
                    layoutId="anatomy-pill"
                    className="absolute inset-0 bg-background rounded-[10px] shadow-sm -z-10"
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-8 px-6 md:px-8">
        {isMobile ? (
          <div className="flex flex-col items-center gap-5">
            <div className="w-56 h-auto py-2">
              <BodySilhouette
                mode={mode}
                segments={values}
                maxVal={maxVal}
                highestKey={highestKey}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 w-full">
              {makeCard('armL', 'left', 0.1)}
              {makeCard('armR', 'right', 0.15)}
              {makeCard('legL', 'left', 0.25)}
              {makeCard('legR', 'right', 0.3)}
            </div>
            <div className="w-full">
              {makeCard('trunk', 'center', 0.2)}
            </div>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{
              gridTemplateColumns: '1fr auto 1fr',
              gridTemplateRows: 'auto auto auto',
              gridTemplateAreas: `
                "armL figure armR"
                "legL figure legR"
                ".    trunk  ."
              `,
            }}
          >
            <div style={{ gridArea: 'armL' }} className="flex items-center justify-end">
              <div className="w-full max-w-[180px]">{makeCard('armL', 'left', 0.1)}</div>
            </div>
            <div style={{ gridArea: 'armR' }} className="flex items-center justify-start">
              <div className="w-full max-w-[180px]">{makeCard('armR', 'right', 0.15)}</div>
            </div>
            <div
              style={{ gridArea: 'figure' }}
              className="flex items-center justify-center px-4"
            >
              <div className="w-44">
                <BodySilhouette
                  mode={mode}
                  segments={values}
                  maxVal={maxVal}
                  highestKey={highestKey}
                />
              </div>
            </div>
            <div style={{ gridArea: 'legL' }} className="flex items-start justify-end">
              <div className="w-full max-w-[180px]">{makeCard('legL', 'left', 0.25)}</div>
            </div>
            <div style={{ gridArea: 'legR' }} className="flex items-start justify-start">
              <div className="w-full max-w-[180px]">{makeCard('legR', 'right', 0.3)}</div>
            </div>
            <div style={{ gridArea: 'trunk' }} className="flex justify-center">
              <div className="w-full max-w-[240px]">
                {makeCard('trunk', 'center', 0.2)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
