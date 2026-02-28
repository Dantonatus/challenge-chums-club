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

  const segmentPaths: { key: string; path: string; delay: number }[] = [
    { key: 'trunk', path: SILHOUETTE_PATHS.trunk, delay: 0 },
    { key: 'armL', path: SILHOUETTE_PATHS.armL, delay: 0.08 },
    { key: 'armR', path: SILHOUETTE_PATHS.armR, delay: 0.12 },
    { key: 'legL', path: SILHOUETTE_PATHS.legL, delay: 0.2 },
    { key: 'legR', path: SILHOUETTE_PATHS.legR, delay: 0.25 },
  ];

  return (
    <motion.svg
      viewBox="0 0 200 400"
      className="w-full h-full max-w-[160px] md:max-w-[180px] mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <defs>
        {segmentPaths.map(({ key }) => {
          const intensity = (segments[key] || 0) / maxVal;
          const opacity = 0.15 + 0.7 * intensity;
          return (
            <radialGradient key={`grad-${key}-${mode}`} id={`grad-${key}`} cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor={softColor} stopOpacity={opacity} />
              <stop offset="100%" stopColor={baseColor} stopOpacity={opacity * 0.4} />
            </radialGradient>
          );
        })}
      </defs>

      {/* Head – soft filled */}
      <motion.path
        d={SILHOUETTE_PATHS.head}
        fill="hsl(var(--muted-foreground))"
        fillOpacity={0.08}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />
      {/* Neck – soft filled */}
      <motion.path
        d={SILHOUETTE_PATHS.neck}
        fill="none"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        strokeOpacity={0.08}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      {/* Segments – no strokes, no glow */}
      <AnimatePresence>
        {segmentPaths.map(({ key, path, delay }) => {
          const isHighest = key === highestKey;
          return (
            <motion.path
              key={`${key}-${mode}`}
              d={path}
              fill={`url(#grad-${key})`}
              fillOpacity={isHighest ? 1 : 0.85}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, delay, ease: [0.32, 0.72, 0, 1] }}
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
            <div style={{ gridArea: 'armL' }} className="flex items-center">
              {makeCard('armL', 'left', 0.1)}
            </div>
            <div style={{ gridArea: 'armR' }} className="flex items-center">
              {makeCard('armR', 'right', 0.15)}
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
            <div style={{ gridArea: 'legL' }} className="flex items-start">
              {makeCard('legL', 'left', 0.25)}
            </div>
            <div style={{ gridArea: 'legR' }} className="flex items-start">
              {makeCard('legR', 'right', 0.3)}
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
