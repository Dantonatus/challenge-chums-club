import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { BodyScan, BodyScanSegments } from '@/lib/bodyscan/types';
import { latestScan, previousScan } from '@/lib/bodyscan/analytics';

type Mode = 'muscle' | 'fat';

interface SegmentDef {
  key: keyof BodyScanSegments['muscle'];
  label: string;
  path: string;
  labelPos: { x: number; y: number };
  anchorPos: { x: number; y: number };
  delay: number;
}

const SEGMENTS: SegmentDef[] = [
  {
    key: 'trunk',
    label: 'Rumpf',
    path: 'M120,90 C118,85 115,82 120,78 L180,78 C185,82 182,85 180,90 L185,140 L190,200 C190,215 188,230 180,245 L120,245 C112,230 110,215 110,200 L115,140 Z',
    labelPos: { x: 150, y: 165 },
    anchorPos: { x: 150, y: 165 },
    delay: 0,
  },
  {
    key: 'armL',
    label: 'Arm L',
    path: 'M110,92 C105,88 98,86 92,90 L72,120 C65,130 58,150 55,170 L50,200 C48,215 50,225 52,240 C54,250 58,255 62,252 C66,248 64,235 63,220 L68,190 C70,175 75,155 80,140 L95,115 C100,108 108,100 110,95 Z',
    labelPos: { x: 22, y: 170 },
    anchorPos: { x: 62, y: 170 },
    delay: 0.1,
  },
  {
    key: 'armR',
    label: 'Arm R',
    path: 'M190,92 C195,88 202,86 208,90 L228,120 C235,130 242,150 245,170 L250,200 C252,215 250,225 248,240 C246,250 242,255 238,252 C234,248 236,235 237,220 L232,190 C230,175 225,155 220,140 L205,115 C200,108 192,100 190,95 Z',
    labelPos: { x: 278, y: 170 },
    anchorPos: { x: 238, y: 170 },
    delay: 0.2,
  },
  {
    key: 'legL',
    label: 'Bein L',
    path: 'M120,248 C118,250 115,252 118,260 L115,310 C113,340 110,370 108,400 L105,430 C104,450 103,465 105,475 C108,485 115,488 120,480 C122,472 122,455 123,440 L128,400 C130,370 133,340 135,310 L140,265 C142,255 145,248 148,248 Z',
    labelPos: { x: 22, y: 380 },
    anchorPos: { x: 112, y: 380 },
    delay: 0.3,
  },
  {
    key: 'legR',
    label: 'Bein R',
    path: 'M180,248 C182,250 185,252 182,260 L185,310 C187,340 190,370 192,400 L195,430 C196,450 197,465 195,475 C192,485 185,488 180,480 C178,472 178,455 177,440 L172,400 C170,370 167,340 165,310 L160,265 C158,255 155,248 152,248 Z',
    labelPos: { x: 278, y: 380 },
    anchorPos: { x: 188, y: 380 },
    delay: 0.4,
  },
];

const HEAD_PATH = 'M150,18 C163,18 174,29 174,42 C174,55 163,66 150,66 C137,66 126,55 126,42 C126,29 137,18 150,18 Z';
const NECK_PATH = 'M140,66 L140,78 L160,78 L160,66';

function getColor(mode: Mode, intensity: number) {
  if (mode === 'muscle') {
    return `hsla(210, 70%, 55%, ${0.25 + 0.75 * intensity})`;
  }
  return `hsla(0, 60%, 55%, ${0.25 + 0.75 * intensity})`;
}

function getGlowColor(mode: Mode) {
  return mode === 'muscle' ? 'hsl(210, 70%, 55%)' : 'hsl(0, 60%, 55%)';
}

export default function AnatomyFigure({ scans }: { scans: BodyScan[] }) {
  const [mode, setMode] = useState<Mode>('muscle');

  const latest = latestScan(scans);
  const previous = previousScan(scans);

  const segments = latest?.segments_json;
  const prevSegments = previous?.segments_json;

  const { values, maxVal } = useMemo(() => {
    if (!segments) return { values: null, maxVal: 0 };
    const src = mode === 'muscle' ? segments.muscle : segments.fat;
    const vals = {
      trunk: src.trunk,
      armL: src.armL,
      armR: src.armR,
      legL: src.legL,
      legR: src.legR,
    };
    const m = Math.max(...Object.values(vals));
    return { values: vals, maxVal: m || 1 };
  }, [segments, mode]);

  const diffs = useMemo(() => {
    if (!segments || !prevSegments) return null;
    const curr = mode === 'muscle' ? segments.muscle : segments.fat;
    const prev = mode === 'muscle' ? prevSegments.muscle : prevSegments.fat;
    return {
      trunk: Math.round((curr.trunk - prev.trunk) * 100) / 100,
      armL: Math.round((curr.armL - prev.armL) * 100) / 100,
      armR: Math.round((curr.armR - prev.armR) * 100) / 100,
      legL: Math.round((curr.legL - prev.legL) * 100) / 100,
      legR: Math.round((curr.legR - prev.legR) * 100) / 100,
    };
  }, [segments, prevSegments, mode]);

  if (!segments || !values) return null;

  const unit = mode === 'muscle' ? 'kg' : '%';
  const highestKey = (Object.entries(values) as [string, number][]).reduce((a, b) => b[1] > a[1] ? b : a)[0];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Segment-Verteilung</CardTitle>
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setMode('muscle')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                mode === 'muscle'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Muskel
            </button>
            <button
              onClick={() => setMode('fat')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
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
      <CardContent className="flex justify-center pb-6">
        <TooltipProvider delayDuration={100}>
          <svg viewBox="0 0 300 500" className="w-full max-w-[280px] h-auto">
            {/* Glow filter */}
            <defs>
              <filter id="glow-pulse" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Head (decorative) */}
            <motion.path
              d={HEAD_PATH}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              opacity={0.3}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.4 }}
            />
            <motion.path
              d={NECK_PATH}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              opacity={0.3}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              transition={{ duration: 0.4 }}
            />

            {/* Body segments */}
            <AnimatePresence mode="wait">
              {SEGMENTS.map((seg) => {
                const val = values[seg.key];
                const intensity = val / maxVal;
                const isHighest = seg.key === highestKey;
                const diff = diffs?.[seg.key];
                const diffStr = diff != null ? (diff > 0 ? `+${diff}` : `${diff}`) : null;

                return (
                  <Tooltip key={`${seg.key}-${mode}`}>
                    <TooltipTrigger asChild>
                      <motion.g style={{ cursor: 'pointer' }}>
                        {/* Segment body */}
                        <motion.path
                          d={seg.path}
                          fill={getColor(mode, intensity)}
                          stroke={getGlowColor(mode)}
                          strokeWidth={isHighest ? 2 : 1}
                          strokeOpacity={isHighest ? 0.8 : 0.3}
                          filter={isHighest ? 'url(#glow-pulse)' : undefined}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            ...(isHighest
                              ? { strokeOpacity: [0.4, 0.9, 0.4] }
                              : {}),
                          }}
                          transition={{
                            opacity: { duration: 0.5, delay: seg.delay },
                            scale: { duration: 0.5, delay: seg.delay },
                            strokeOpacity: isHighest
                              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
                              : undefined,
                          }}
                          whileHover={{ scale: 1.04 }}
                          style={{ transformOrigin: `${seg.anchorPos.x}px ${seg.anchorPos.y}px` }}
                        />

                        {/* Connector line */}
                        <motion.line
                          x1={seg.anchorPos.x}
                          y1={seg.anchorPos.y}
                          x2={seg.labelPos.x}
                          y2={seg.labelPos.y}
                          stroke="hsl(var(--muted-foreground))"
                          strokeWidth="0.75"
                          strokeDasharray="3 2"
                          opacity={0.4}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: seg.delay + 0.3 }}
                        />

                        {/* Label background */}
                        <motion.rect
                          x={seg.labelPos.x - (seg.labelPos.x < 150 ? 38 : -2)}
                          y={seg.labelPos.y - 10}
                          width="36"
                          height="20"
                          rx="4"
                          fill="hsl(var(--card))"
                          stroke="hsl(var(--border))"
                          strokeWidth="0.5"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.95 }}
                          transition={{ duration: 0.3, delay: seg.delay + 0.5 }}
                        />

                        {/* Label text */}
                        <motion.text
                          x={seg.labelPos.x - (seg.labelPos.x < 150 ? 20 : -20)}
                          y={seg.labelPos.y + 4}
                          textAnchor="middle"
                          className="text-[10px] font-semibold"
                          fill="hsl(var(--foreground))"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.3, delay: seg.delay + 0.5 }}
                        >
                          {val.toFixed(1)} {unit}
                        </motion.text>
                      </motion.g>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="font-semibold">{seg.label}</div>
                      <div>
                        {val.toFixed(1)} {unit}
                        {diffStr && (
                          <span className={diff! > 0 ? 'text-emerald-500 ml-1' : 'text-red-500 ml-1'}>
                            ({diffStr})
                          </span>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </AnimatePresence>
          </svg>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
