import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { BodyScan, BodyScanSegments } from '@/lib/bodyscan/types';
import { latestScan, previousScan } from '@/lib/bodyscan/analytics';

type Mode = 'muscle' | 'fat';

interface SegmentData {
  key: keyof BodyScanSegments['muscle'];
  label: string;
  value: number;
  intensity: number;
  diff: number | null;
  isHighest: boolean;
}

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
  side,
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

  // For muscle: positive = good (green), negative = bad (red)
  // For fat: positive = bad (red), negative = good (green)
  const isGood = mode === 'muscle' ? diffPositive : diffNegative;
  const isBad = mode === 'muscle' ? diffNegative : diffPositive;

  const gradientClass =
    mode === 'muscle'
      ? 'from-[hsl(210,80%,55%)] to-[hsl(210,90%,70%)]'
      : 'from-[hsl(0,70%,55%)] to-[hsl(0,80%,68%)]';

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: side === 'left' ? -24 : side === 'right' ? 24 : 0,
        y: side === 'center' ? 16 : 0,
      }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay,
      }}
      className={`
        relative rounded-2xl border border-border/50 
        bg-card/60 backdrop-blur-xl p-4
        shadow-sm dark:shadow-none
        transition-transform duration-200 hover:scale-[1.02] hover:border-border
        ${isHighest ? 'ring-1 ring-primary/20' : ''}
      `}
    >
      {/* Segment name */}
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">
        {label}
      </p>

      {/* Value */}
      <div className="flex items-baseline gap-1.5 mb-2.5">
        <span className="text-xl font-semibold tracking-tight text-foreground">
          {(value ?? 0).toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground font-medium">{unit}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden mb-2">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${gradientClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(intensity * 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: delay + 0.2 }}
        />
      </div>

      {/* Diff badge */}
      {diff != null && (
        <div className="flex items-center gap-1">
          {isGood && <TrendingUp className="w-3 h-3 text-emerald-500" />}
          {isBad && <TrendingDown className="w-3 h-3 text-red-500" />}
          {!isGood && !isBad && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
          <span
            className={`text-[11px] font-medium ${
              isGood ? 'text-emerald-500' : isBad ? 'text-red-500' : 'text-muted-foreground'
            }`}
          >
            {diff > 0 ? '+' : ''}
            {diff.toFixed(2)} {unit}
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── SVG Silhouette ─── */

const SILHOUETTE_PATHS = {
  head: 'M100,10 C112,10 122,20 122,32 C122,44 112,54 100,54 C88,54 78,44 78,32 C78,20 88,10 100,10 Z',
  neck: 'M92,54 C92,58 90,62 90,66 L110,66 C110,62 108,58 108,54',
  trunk:
    'M68,72 C65,70 62,68 60,72 L56,78 C54,82 56,84 60,84 L60,84 L68,72 Z ' +
    'M132,72 C135,70 138,68 140,72 L144,78 C146,82 144,84 140,84 L140,84 L132,72 Z ' +
    'M72,66 C68,68 64,72 62,78 L60,84 C58,92 60,96 62,100 L64,130 C62,148 62,166 66,180 ' +
    'C68,186 72,190 78,192 L122,192 C128,190 132,186 134,180 C138,166 138,148 136,130 ' +
    'L138,100 C140,96 142,92 140,84 L138,78 C136,72 132,68 128,66 Z',
  armL:
    'M62,78 C56,76 48,78 42,84 L32,100 C26,112 22,128 20,144 ' +
    'L18,168 C16,180 16,192 18,200 C18,206 20,210 24,212 ' +
    'C28,214 30,210 30,204 L32,188 C33,176 35,164 38,148 ' +
    'L46,124 C50,114 54,104 58,96 L60,84 Z',
  armR:
    'M138,78 C144,76 152,78 158,84 L168,100 C174,112 178,128 180,144 ' +
    'L182,168 C184,180 184,192 182,200 C182,206 180,210 176,212 ' +
    'C172,214 170,210 170,204 L168,188 C167,176 165,164 162,148 ' +
    'L154,124 C150,114 146,104 142,96 L140,84 Z',
  legL:
    'M78,192 C74,194 72,198 72,204 L68,240 C66,264 64,288 62,312 ' +
    'L58,348 C56,364 56,376 58,384 C60,390 64,392 68,388 ' +
    'C70,384 70,374 72,360 L76,324 C78,300 80,276 82,252 ' +
    'L86,220 C88,210 90,202 92,196 L98,192 Z',
  legR:
    'M122,192 C126,194 128,198 128,204 L132,240 C134,264 136,288 138,312 ' +
    'L142,348 C144,364 144,376 142,384 C140,390 136,392 132,388 ' +
    'C130,384 130,374 128,360 L124,324 C122,300 120,276 118,252 ' +
    'L114,220 C112,210 110,202 108,196 L102,192 Z',
};

function getGradientColors(mode: Mode) {
  if (mode === 'muscle') {
    return { inner: 'hsl(210, 85%, 60%)', outer: 'hsl(210, 70%, 45%)' };
  }
  return { inner: 'hsl(0, 75%, 58%)', outer: 'hsl(0, 60%, 45%)' };
}

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
  const colors = getGradientColors(mode);

  const segmentPaths: { key: string; path: string; delay: number }[] = [
    { key: 'trunk', path: SILHOUETTE_PATHS.trunk, delay: 0 },
    { key: 'armL', path: SILHOUETTE_PATHS.armL, delay: 0.1 },
    { key: 'armR', path: SILHOUETTE_PATHS.armR, delay: 0.15 },
    { key: 'legL', path: SILHOUETTE_PATHS.legL, delay: 0.25 },
    { key: 'legR', path: SILHOUETTE_PATHS.legR, delay: 0.3 },
  ];

  return (
    <motion.svg
      viewBox="0 0 200 400"
      className="w-full h-full max-w-[160px] md:max-w-[180px] mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <defs>
        {segmentPaths.map(({ key }) => {
          const intensity = (segments[key] || 0) / maxVal;
          const opacity = 0.2 + 0.8 * intensity;
          return (
            <radialGradient key={`grad-${key}-${mode}`} id={`grad-${key}`} cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor={colors.inner} stopOpacity={opacity} />
              <stop offset="100%" stopColor={colors.outer} stopOpacity={opacity * 0.5} />
            </radialGradient>
          );
        })}
        <filter id="segment-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Head */}
      <motion.path
        d={SILHOUETTE_PATHS.head}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1.2"
        opacity={0.25}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 0.5 }}
      />
      {/* Neck */}
      <motion.path
        d={SILHOUETTE_PATHS.neck}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        opacity={0.2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 0.5 }}
      />

      {/* Segments */}
      <AnimatePresence mode="wait">
        {segmentPaths.map(({ key, path, delay }) => {
          const isHighest = key === highestKey;
          return (
            <motion.path
              key={`${key}-${mode}`}
              d={path}
              fill={`url(#grad-${key})`}
              stroke={colors.inner}
              strokeWidth={isHighest ? 1.5 : 0.5}
              strokeOpacity={isHighest ? 0.6 : 0.15}
              filter={isHighest ? 'url(#segment-glow)' : undefined}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                ...(isHighest ? { strokeOpacity: [0.3, 0.7, 0.3] } : {}),
              }}
              transition={{
                opacity: { duration: 0.5, delay },
                strokeOpacity: isHighest
                  ? { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                  : undefined,
              }}
            />
          );
        })}
      </AnimatePresence>
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Körperanalyse</CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode('muscle')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-300 ${
                mode === 'muscle'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Muskel
            </button>
            <button
              onClick={() => setMode('fat')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-300 ${
                mode === 'fat'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Fett
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        {isMobile ? (
          /* ─── Mobile: Figure + stacked cards ─── */
          <div className="flex flex-col items-center gap-4">
            <div className="w-40 h-auto">
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
          /* ─── Desktop: CSS Grid with figure centered ─── */
          <div
            className="grid gap-3"
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
            <div style={{ gridArea: 'armL' }} className="flex items-center">
              {makeCard('armL', 'left', 0.1)}
            </div>
            <div style={{ gridArea: 'armR' }} className="flex items-center">
              {makeCard('armR', 'right', 0.15)}
            </div>
            <div
              style={{ gridArea: 'figure' }}
              className="flex items-center justify-center px-2"
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
            <div style={{ gridArea: 'legL' }} className="flex items-start">
              {makeCard('legL', 'left', 0.25)}
            </div>
            <div style={{ gridArea: 'legR' }} className="flex items-start">
              {makeCard('legR', 'right', 0.3)}
            </div>
            <div style={{ gridArea: 'trunk' }} className="flex justify-center">
              <div className="w-full max-w-[200px]">
                {makeCard('trunk', 'center', 0.2)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
