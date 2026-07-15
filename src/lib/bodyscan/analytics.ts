import type { BodyScan } from './types';

/** Get the latest (most recent) scan */
export function latestScan(scans: BodyScan[]): BodyScan | null {
  if (scans.length === 0) return null;
  return scans[scans.length - 1];
}

/** Get the first (oldest) scan */
export function firstScan(scans: BodyScan[]): BodyScan | null {
  if (scans.length === 0) return null;
  return scans[0];
}

/** Get the previous scan (second to last) */
export function previousScan(scans: BodyScan[]): BodyScan | null {
  if (scans.length < 2) return null;
  return scans[scans.length - 2];
}

/** Calculate difference between latest and first/previous scan for a given numeric key */
export function trendDiff(scans: BodyScan[], key: keyof BodyScan, vsFirst = false): number | null {
  const latest = latestScan(scans);
  const compare = vsFirst ? firstScan(scans) : previousScan(scans);
  if (!latest || !compare) return null;
  const a = latest[key] as number | null;
  const b = compare[key] as number | null;
  if (a == null || b == null) return null;
  return Math.round((a - b) * 100) / 100;
}

/** Format a trend number as "+X.X" or "-X.X" */
export function formatTrend(val: number | null, unit = ''): string | undefined {
  if (val == null) return undefined;
  const sign = val > 0 ? '+' : '';
  return `${sign}${val}${unit}`;
}

/** Chart data: composition over time (absolute) */
export function compositionChartData(scans: BodyScan[]) {
  return scans.map(s => ({
    date: s.scan_date,
    Gewicht: s.weight_kg,
    Muskelmasse: s.muscle_mass_kg,
    Fettmasse: s.fat_mass_kg,
  }));
}

/** Chart data: composition as % change from first scan */
export function compositionChangeData(scans: BodyScan[]) {
  if (scans.length === 0) return [];
  const base = scans[0];
  const bw = base.weight_kg;
  const bm = base.muscle_mass_kg;
  const bf = base.fat_mass_kg;
  return scans.map(s => ({
    date: s.scan_date,
    'Gewicht %': bw ? Math.round(((s.weight_kg ?? bw) - bw) / bw * 10000) / 100 : 0,
    'Muskelmasse %': bm ? Math.round(((s.muscle_mass_kg ?? bm) - bm) / bm * 10000) / 100 : 0,
    'Fettmasse %': bf ? Math.round(((s.fat_mass_kg ?? bf) - bf) / bf * 10000) / 100 : 0,
    absGewicht: s.weight_kg,
    absMuskel: s.muscle_mass_kg,
    absFett: s.fat_mass_kg,
  }));
}

/** Chart data: fat% vs muscle mass over time */
export function fatMuscleChartData(scans: BodyScan[]) {
  return scans.map(s => ({
    date: s.scan_date,
    'Körperfett %': s.fat_percent,
    'Muskelmasse kg': s.muscle_mass_kg,
  }));
}

/** Compute a tight [min, max] domain for Y-axis so small changes are visible */
export function computeTightDomain(values: (number | null | undefined)[], padding = 0.1): [number, number] {
  const nums = values.filter((v): v is number => v != null && isFinite(v));
  if (nums.length === 0) return [0, 100];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = max - min || 1;
  const pad = Math.max(span * padding, 0.5);
  return [Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10];
}

// ═══════════════════════════════════════════════════════════════════
// RECOMPOSITION INTELLIGENCE — deterministische, reine Funktionen
// Kein medizinisches Wording, keine Diagnose, keine "gut/schlecht"-Norm.
// ═══════════════════════════════════════════════════════════════════

import { parseLocalDate } from '@/lib/health/periods';
import type { HealthGoal } from '@/hooks/useHealthGoal';

export type BaselineMode = 'previous' | 'first' | 'custom';

export interface ScanComparability {
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  sameDevice: boolean;
  daysApart: number;
  timeOfDayDeltaMin: number | null;
  coreFieldsPresent: boolean;
}

const CORE_FIELDS: Array<keyof BodyScan> = [
  'weight_kg', 'fat_mass_kg', 'muscle_mass_kg', 'fat_percent',
];

function parseScanDateTime(s: BodyScan): Date {
  const iso = `${s.scan_date}T${(s.scan_time || '00:00:00').slice(0, 8)}`;
  return parseLocalDate(iso);
}

function timeOfDayMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function scanComparability(current: BodyScan, baseline: BodyScan): ScanComparability {
  const reasons: string[] = [];
  const daysApart = Math.abs(
    Math.round(
      (parseLocalDate(current.scan_date).getTime() - parseLocalDate(baseline.scan_date).getTime()) / 86_400_000,
    ),
  );
  const sameDevice = !!current.device && !!baseline.device && current.device === baseline.device;

  const tA = timeOfDayMinutes(current.scan_time);
  const tB = timeOfDayMinutes(baseline.scan_time);
  const timeOfDayDeltaMin = tA != null && tB != null ? Math.abs(tA - tB) : null;

  const coreCurr = CORE_FIELDS.every(k => current[k] != null);
  const coreBase = CORE_FIELDS.every(k => baseline[k] != null);
  const coreFieldsPresent = coreCurr && coreBase;

  if (!coreFieldsPresent) reasons.push('Nicht alle Kernfelder in beiden Scans vorhanden.');
  if (!sameDevice) reasons.push('Unterschiedliche Geräte.');
  if (timeOfDayDeltaMin != null && timeOfDayDeltaMin > 180) {
    reasons.push(`Messzeit weicht um ${Math.round(timeOfDayDeltaMin / 60)} h ab.`);
  }
  if (daysApart < 3) reasons.push('Sehr kurzer Abstand – Messschwankung überlagert Trend.');
  if (daysApart > 365) reasons.push('Sehr großer Abstand – zwischenzeitliche Veränderungen unklar.');

  let confidence: ScanComparability['confidence'] = 'high';
  if (reasons.length >= 2 || !coreFieldsPresent) confidence = 'low';
  else if (reasons.length === 1) confidence = 'medium';

  return { confidence, reasons, sameDevice, daysApart, timeOfDayDeltaMin, coreFieldsPresent };
}

export interface ScanDelta {
  key: keyof BodyScan;
  label: string;
  unit: string;
  current: number | null;
  baseline: number | null;
  abs: number | null;
  pct: number | null;
}

const DELTA_FIELDS: Array<{ key: keyof BodyScan; label: string; unit: string }> = [
  { key: 'weight_kg', label: 'Gewicht', unit: 'kg' },
  { key: 'fat_mass_kg', label: 'Fettmasse', unit: 'kg' },
  { key: 'muscle_mass_kg', label: 'Muskelmasse', unit: 'kg' },
  { key: 'skeletal_muscle_mass_kg', label: 'Skelettmuskel', unit: 'kg' },
  { key: 'fat_percent', label: 'Körperfett', unit: '%' },
  { key: 'bmi', label: 'BMI', unit: '' },
  { key: 'visceral_fat', label: 'Viszeralfett', unit: '' },
  { key: 'bmr_kcal', label: 'Grundumsatz', unit: 'kcal' },
  { key: 'tbw_percent', label: 'Wasser', unit: '%' },
  { key: 'ecw_tbw_ratio', label: 'ECW/TBW', unit: '' },
];

export function compareScans(current: BodyScan, baseline: BodyScan): ScanDelta[] {
  return DELTA_FIELDS.map(({ key, label, unit }) => {
    const a = current[key] as number | null;
    const b = baseline[key] as number | null;
    const abs = a != null && b != null ? Math.round((a - b) * 100) / 100 : null;
    const pct = abs != null && b && b !== 0 ? Math.round((abs / b) * 1000) / 10 : null;
    return { key, label, unit, current: a, baseline: b, abs, pct };
  });
}

// ─── Composition Bridge ─────────────────────────────────────────────
// Nicht-überlappende Zerlegung: ΔGewicht = ΔFettmasse + ΔFettfreie Masse.
// Fettfreie Masse (FFM) = Gewicht − Fettmasse.  Muskelmasse ist Teilmenge der FFM,
// deshalb nur als sekundärer Hinweis, nie doppelt gezählt.

export interface BridgeStep {
  key: 'start' | 'fat' | 'ffm' | 'end';
  label: string;
  value: number;         // Absolutwert bei start/end, delta bei fat/ffm
  cumulative: number;    // laufende Summe (Gewicht) an diesem Schritt
  kind: 'anchor' | 'positive' | 'negative';
}

export interface CompositionBridge {
  available: boolean;
  reason?: string;
  steps: BridgeStep[];
  ffmDelta: number | null;
  fatDelta: number | null;
  weightDelta: number;
  muscleHint: number | null;  // ΔMuskelmasse (nur zur Kontextanzeige)
}

export function buildRecompositionBridge(current: BodyScan, baseline: BodyScan): CompositionBridge {
  const wA = current.weight_kg, wB = baseline.weight_kg;
  const fA = current.fat_mass_kg, fB = baseline.fat_mass_kg;
  if (wA == null || wB == null) {
    return { available: false, reason: 'Gewicht in einem Scan nicht vorhanden.', steps: [], ffmDelta: null, fatDelta: null, weightDelta: 0, muscleHint: null };
  }
  if (fA == null || fB == null) {
    // ohne Fettmasse können wir die Zerlegung nicht sauber machen
    return {
      available: false,
      reason: 'Fettmasse in einem Scan nicht vorhanden – Zerlegung nicht möglich.',
      steps: [],
      ffmDelta: null,
      fatDelta: null,
      weightDelta: Math.round((wA - wB) * 100) / 100,
      muscleHint: current.muscle_mass_kg != null && baseline.muscle_mass_kg != null
        ? Math.round((current.muscle_mass_kg - baseline.muscle_mass_kg) * 100) / 100
        : null,
    };
  }

  const fatDelta = Math.round((fA - fB) * 100) / 100;
  const ffmA = wA - fA;
  const ffmB = wB - fB;
  const ffmDelta = Math.round((ffmA - ffmB) * 100) / 100;
  const weightDelta = Math.round((wA - wB) * 100) / 100;

  const steps: BridgeStep[] = [
    { key: 'start', label: 'Start', value: Math.round(wB * 100) / 100, cumulative: wB, kind: 'anchor' },
    {
      key: 'fat',
      label: 'Δ Fettmasse',
      value: fatDelta,
      cumulative: Math.round((wB + fatDelta) * 100) / 100,
      kind: fatDelta >= 0 ? 'positive' : 'negative',
    },
    {
      key: 'ffm',
      label: 'Δ fettfreie Masse',
      value: ffmDelta,
      cumulative: Math.round(wA * 100) / 100,
      kind: ffmDelta >= 0 ? 'positive' : 'negative',
    },
    { key: 'end', label: 'Aktuell', value: Math.round(wA * 100) / 100, cumulative: wA, kind: 'anchor' },
  ];

  const muscleHint = current.muscle_mass_kg != null && baseline.muscle_mass_kg != null
    ? Math.round((current.muscle_mass_kg - baseline.muscle_mass_kg) * 100) / 100
    : null;

  return { available: true, steps, ffmDelta, fatDelta, weightDelta, muscleHint };
}

// ─── Recomposition Quadrant ─────────────────────────────────────────

export interface QuadrantPoint {
  scanId: string;
  scan_date: string;
  dFat: number;
  dMuscle: number;
  isCurrent: boolean;
  isBaseline: boolean;
}

export function buildRecompositionQuadrant(scans: BodyScan[], baseline: BodyScan): QuadrantPoint[] {
  return scans
    .filter(s =>
      s.fat_mass_kg != null &&
      s.muscle_mass_kg != null &&
      baseline.fat_mass_kg != null &&
      baseline.muscle_mass_kg != null,
    )
    .map(s => ({
      scanId: s.id,
      scan_date: s.scan_date,
      dFat: Math.round(((s.fat_mass_kg as number) - (baseline.fat_mass_kg as number)) * 100) / 100,
      dMuscle: Math.round(((s.muscle_mass_kg as number) - (baseline.muscle_mass_kg as number)) * 100) / 100,
      isCurrent: false,
      isBaseline: s.id === baseline.id,
    }));
}

// ─── Symmetry ───────────────────────────────────────────────────────

export interface SymmetryPair {
  label: string;
  left: number;
  right: number;
  absDiff: number;      // rechts − links
  pctAsymmetry: number; // |diff| / max * 100
}

export function segmentSymmetry(scan: BodyScan, mode: 'muscle' | 'fat'): SymmetryPair[] | null {
  const seg = scan.segments_json;
  if (!seg) return null;
  const src = mode === 'muscle' ? seg.muscle : seg.fat;
  const pairs: Array<{ label: string; l: number; r: number }> = [
    { label: 'Arme', l: src.armL, r: src.armR },
    { label: 'Beine', l: src.legL, r: src.legR },
  ];
  return pairs.map(({ label, l, r }) => {
    const absDiff = Math.round((r - l) * 100) / 100;
    const max = Math.max(Math.abs(l), Math.abs(r)) || 1;
    return {
      label,
      left: l,
      right: r,
      absDiff,
      pctAsymmetry: Math.round((Math.abs(absDiff) / max) * 1000) / 10,
    };
  });
}

// ─── Insights ───────────────────────────────────────────────────────

export type BodyInsightTone = 'positive' | 'watch' | 'neutral' | 'primary';

export interface BodyScanInsight {
  tone: BodyInsightTone;
  eyebrow: string;
  headline: string;
  explanation: string;
  evidence: Array<{ label: string; value: string }>;
}

const MEASUREMENT_NOISE_KG = 0.5;

export function buildBodyScanInsights(
  current: BodyScan | null,
  baseline: BodyScan | null,
  goal: HealthGoal | null,
): BodyScanInsight {
  if (!current) {
    return {
      tone: 'neutral',
      eyebrow: 'Kein Scan',
      headline: 'Noch kein Scan im gewählten Zeitraum',
      explanation: 'Importiere TANITA-Scans oder erweitere den Zeitraum, damit hier Aussagen zur Zusammensetzung entstehen.',
      evidence: [],
    };
  }
  if (!baseline || baseline.id === current.id) {
    return {
      tone: 'neutral',
      eyebrow: 'Erster Scan',
      headline: 'Ein einzelner Scan liefert noch keinen Trend',
      explanation: 'Für eine Recomposition-Aussage werden mindestens zwei vergleichbare Scans benötigt.',
      evidence: [
        { label: 'Datum', value: current.scan_date },
        { label: 'Gerät', value: current.device || '–' },
      ],
    };
  }

  const bridge = buildRecompositionBridge(current, baseline);
  const comparability = scanComparability(current, baseline);
  const goalMode = goal?.goal_mode;

  const evidenceBase = [
    { label: 'Vergleichsdatum', value: formatGermanDate(baseline.scan_date) },
    { label: 'Abstand', value: `${comparability.daysApart} Tage` },
    { label: 'Gerät', value: comparability.sameDevice ? current.device || '–' : 'unterschiedlich' },
  ];
  if (comparability.timeOfDayDeltaMin != null && comparability.timeOfDayDeltaMin > 60) {
    evidenceBase.push({ label: 'Uhrzeitabweichung', value: `${Math.round(comparability.timeOfDayDeltaMin)} min` });
  }

  if (!bridge.available) {
    return {
      tone: 'neutral',
      eyebrow: 'Datenlage',
      headline: 'Recomposition kann noch nicht zerlegt werden',
      explanation: bridge.reason || 'Nicht genügend Kernfelder in beiden Scans vorhanden.',
      evidence: evidenceBase,
    };
  }

  const dW = bridge.weightDelta;
  const dFat = bridge.fatDelta ?? 0;
  const dFfm = bridge.ffmDelta ?? 0;
  const dMuscle = bridge.muscleHint;

  const strongFatDown = dFat <= -0.5;
  const strongFatUp = dFat >= 0.5;
  const strongFfmUp = dFfm >= 0.5;
  const strongFfmDown = dFfm <= -0.5;

  // Prio 1: Recomposition (Muskel/FFM ↑, Fett ↓)
  if (strongFfmUp && strongFatDown) {
    return {
      tone: 'positive',
      eyebrow: 'Stärkste Veränderung',
      headline: `${signed(dMuscle ?? dFfm)} kg Muskelmasse bei ${signed(dFat)} kg Fettmasse seit dem Vergleichsscan.`,
      explanation: `Fettfreie Masse ist um ${signed(dFfm)} kg gestiegen, Fettmasse um ${signed(dFat)} kg gesunken. Das Gesamtgewicht (${signed(dW)} kg) allein würde diese Entwicklung nicht zeigen.`,
      evidence: evidenceBase,
    };
  }

  // Prio 2: reiner Fettverlust ohne FFM-Verlust
  if (strongFatDown && !strongFfmDown) {
    return {
      tone: 'positive',
      eyebrow: 'Zusammensetzung',
      headline: `Fettmasse ist um ${signed(dFat)} kg gesunken – fettfreie Masse gehalten.`,
      explanation: `Gewicht ${signed(dW)} kg, fettfreie Masse ${signed(dFfm)} kg. Die Zusammensetzung entwickelt sich in Richtung höherem Muskelanteil.`,
      evidence: evidenceBase,
    };
  }

  // Prio 3: Gewichtsverlust mit möglichem FFM-Verlust – neutral & vorsichtig
  if (dW <= -0.5 && strongFfmDown) {
    return {
      tone: 'watch',
      eyebrow: 'Zusammensetzung',
      headline: `Gewicht ${signed(dW)} kg – davon ${signed(dFfm)} kg aus fettfreier Masse.`,
      explanation: `Ein Teil des Gewichtsverlusts kommt nicht aus Fettmasse. Ohne Intensitätsdaten lässt sich keine Trainingsempfehlung ableiten – die Beobachtung ist rein deskriptiv.`,
      evidence: evidenceBase,
    };
  }

  // Prio 4: Fettzunahme
  if (strongFatUp) {
    return {
      tone: goalMode === 'weight_gain' || goalMode === 'recomposition' ? 'neutral' : 'watch',
      eyebrow: 'Zusammensetzung',
      headline: `Fettmasse hat um ${signed(dFat)} kg zugenommen.`,
      explanation: `Gewicht ${signed(dW)} kg, fettfreie Masse ${signed(dFfm)} kg. Die Aussage ist rein beschreibend; Ursachen liegen außerhalb der Messung.`,
      evidence: evidenceBase,
    };
  }

  // Prio 5: FFM-Aufbau bei stabilem Fett
  if (strongFfmUp && Math.abs(dFat) < MEASUREMENT_NOISE_KG) {
    return {
      tone: 'positive',
      eyebrow: 'Zusammensetzung',
      headline: `Fettfreie Masse ${signed(dFfm)} kg – Fett stabil.`,
      explanation: `Reiner FFM-Aufbau bei nahezu unverändertem Fett. Gesamtgewicht ${signed(dW)} kg.`,
      evidence: evidenceBase,
    };
  }

  // Prio 6: Alles innerhalb Messschwankung
  if (Math.abs(dW) < MEASUREMENT_NOISE_KG && Math.abs(dFat) < MEASUREMENT_NOISE_KG) {
    return {
      tone: 'neutral',
      eyebrow: 'Zusammensetzung',
      headline: 'Weitgehend stabil im Vergleich zum Referenzscan',
      explanation: `Die Änderungen liegen im Bereich normaler BIA-Schwankungen (±${MEASUREMENT_NOISE_KG} kg). Es ist keine belastbare Richtungsaussage möglich.`,
      evidence: evidenceBase,
    };
  }

  return {
    tone: 'primary',
    eyebrow: 'Zusammensetzung',
    headline: `Gewicht ${signed(dW)} kg, Fett ${signed(dFat)} kg, fettfreie Masse ${signed(dFfm)} kg`,
    explanation: 'Beschreibung der beobachteten Veränderung ohne Bewertung.',
    evidence: evidenceBase,
  };
}

function signed(n: number | null): string {
  if (n == null) return '–';
  const s = n >= 0 ? '+' : '';
  return `${s}${n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
}

export function formatGermanDate(iso: string): string {
  const d = parseLocalDate(iso);
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}
