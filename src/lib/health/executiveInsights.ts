// Deterministische Insight-Engine für das Performance-Intelligence-Reporting.
// Keine KI, kein Zufall — nur nachvollziehbare Regeln mit Evidenz.

import type { TrainingCheckin } from '@/lib/training/types';
import type { BodyScan } from '@/lib/bodyscan/types';
import type { WeightEntry } from '@/lib/weight/types';
import type { SmartScaleEntry } from '@/lib/smartscale/types';
import type { HealthGoal } from '@/hooks/useHealthGoal';
import {
  Period,
  ComparisonMode,
  filterByPeriod,
  parseLocalDate,
  getPreviousPeriod,
  diffDaysInclusive,
} from './periods';

export type InsightPriority = 'primary' | 'positive' | 'watch' | 'neutral';

export interface InsightEvidence {
  label: string;
  value: string;
}

export interface Insight {
  id: string;
  priority: InsightPriority;
  eyebrow: string;
  title: string;
  explanation: string;
  evidence: InsightEvidence[];
  actionLabel?: string;
  methodology?: string;
}

export interface InsightInput {
  checkins: TrainingCheckin[];
  scans: BodyScan[];
  weights: WeightEntry[];
  smartScale: SmartScaleEntry[];
  goal: HealthGoal | null;
  period: Period;
  comparison: ComparisonMode;
}

const fmt1 = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt0 = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 });
const signed = (n: number, digits = 1) =>
  (n >= 0 ? '+' : '') + n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function firstLast<T>(arr: T[]): [T, T] | null {
  return arr.length >= 2 ? [arr[0], arr[arr.length - 1]] : null;
}

export function computeInsights(input: InsightInput): Insight[] {
  const { checkins, scans, weights, smartScale, goal, period } = input;
  const insights: Insight[] = [];

  const periodScans = filterByPeriod(scans, period, 'scan_date');
  const periodCheckins = filterByPeriod(checkins, period, 'checkin_date');
  const periodWeights = filterByPeriod(weights, period, 'date');
  const periodScale = filterByPeriod(smartScale, period, 'measured_at');

  const scanPair = firstLast(periodScans);

  // -------- 1) Recomposition (Priorität: primary) --------
  if (scanPair) {
    const [a, b] = scanPair;
    const dWeight = (b.weight_kg ?? 0) - (a.weight_kg ?? 0);
    const dMuscle = (b.muscle_mass_kg ?? 0) - (a.muscle_mass_kg ?? 0);
    const dFat = (b.fat_mass_kg ?? 0) - (a.fat_mass_kg ?? 0);
    if (dMuscle > 0.3 && dFat < -0.3) {
      insights.push({
        id: 'recomposition',
        priority: 'primary',
        eyebrow: 'Körperzusammensetzung',
        title: 'Recomposition im Zeitraum – Muskel auf, Fett ab',
        explanation:
          'Muskelmasse ist gestiegen, während Fettmasse gesunken ist. Das ist ein klar positives Signal, unabhängig davon, wie sich das reine Körpergewicht bewegt hat.',
        evidence: [
          { label: 'Muskelmasse', value: `${signed(dMuscle)} kg` },
          { label: 'Fettmasse', value: `${signed(dFat)} kg` },
          { label: 'Gewicht', value: `${signed(dWeight)} kg` },
        ],
        methodology: 'Vergleich erster vs. letzter TANITA-Scan im Zeitraum.',
      });
    } else if (Math.abs(dWeight) >= 0.5 || Math.abs(dFat) >= 0.5 || Math.abs(dMuscle) >= 0.5) {
      insights.push({
        id: 'composition-delta',
        priority: dFat < 0 ? 'positive' : 'watch',
        eyebrow: 'Körperzusammensetzung',
        title:
          dFat < 0
            ? 'Fettmasse ist im Zeitraum gesunken'
            : dFat > 0
              ? 'Fettmasse ist im Zeitraum gestiegen'
              : 'Gewichtsverlauf mit stabiler Zusammensetzung',
        explanation:
          'Bewegung zwischen erstem und letztem Scan im gewählten Zeitraum. Bewertung berücksichtigt ausschließlich TANITA-Messungen.',
        evidence: [
          { label: 'Gewicht', value: `${signed(dWeight)} kg` },
          { label: 'Muskelmasse', value: `${signed(dMuscle)} kg` },
          { label: 'Fettmasse', value: `${signed(dFat)} kg` },
        ],
        methodology: 'Erster vs. letzter Scan im Zeitraum.',
      });
    }
  } else if (periodScans.length === 1) {
    insights.push({
      id: 'scan-single',
      priority: 'neutral',
      eyebrow: 'Datengrundlage',
      title: 'Nur ein Scan im Zeitraum – noch kein Trend',
      explanation:
        'Für eine belastbare Aussage zur Körperzusammensetzung ist mindestens ein zweiter Scan im gewählten Zeitraum nötig.',
      evidence: [{ label: 'Scans im Zeitraum', value: `${periodScans.length}` }],
    });
  }

  // -------- 2) Trainingsfrequenz-Delta (letzte 4W vs. vorherige 4W) --------
  const now = period.end;
  const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
  const recentStart = new Date(now.getTime() - fourWeeksMs);
  const priorStart = new Date(recentStart.getTime() - fourWeeksMs);
  const recentCount = checkins.filter((c) => {
    const d = parseLocalDate(c.checkin_date);
    return d >= recentStart && d <= now;
  }).length;
  const priorCount = checkins.filter((c) => {
    const d = parseLocalDate(c.checkin_date);
    return d >= priorStart && d < recentStart;
  }).length;

  if (recentCount + priorCount >= 4) {
    const delta = recentCount - priorCount;
    const pct = priorCount > 0 ? (delta / priorCount) * 100 : 0;
    insights.push({
      id: 'training-frequency-4w',
      priority: delta > 0 ? 'positive' : delta < 0 ? 'watch' : 'neutral',
      eyebrow: 'Trainingsrhythmus',
      title:
        delta > 0
          ? `Trainingsfrequenz ${signed(delta, 0)} Einheiten in den letzten 4 Wochen`
          : delta < 0
            ? `Trainingsfrequenz ${signed(delta, 0)} Einheiten – Rhythmus schwächer`
            : 'Trainingsfrequenz konstant zum vorherigen 4-Wochen-Fenster',
      explanation:
        priorCount > 0
          ? `Im Vergleich zur Vorperiode ${signed(pct, 0)} %. Zwei geschlossene 4-Wochen-Fenster, keine unvollständige laufende Woche.`
          : 'Vorheriges 4-Wochen-Fenster ohne Trainings – Vergleich basiert nur auf aktueller Periode.',
      evidence: [
        { label: 'Letzte 4 Wochen', value: `${recentCount}` },
        { label: 'Vorherige 4 Wochen', value: `${priorCount}` },
      ],
      methodology: 'Zwei zusammenhängende, gleich lange 4-Wochen-Fenster relativ zum Perioden-Ende.',
    });
  }

  // -------- 3) Ziel-Fortschritt Gewicht --------
  if (goal && goal.target_weight_kg && (periodWeights.length >= 2 || periodScale.length >= 2)) {
    const combined: { date: Date; kg: number }[] = [
      ...periodWeights.map((w) => ({ date: parseLocalDate(w.date), kg: Number(w.weight_kg) })),
      ...periodScale
        .filter((s) => s.weight_kg !== null)
        .map((s) => ({ date: parseLocalDate(s.measured_at), kg: Number(s.weight_kg) })),
    ]
      .filter((r) => Number.isFinite(r.kg))
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    if (combined.length >= 2) {
      const first = combined[0];
      const last = combined[combined.length - 1];
      const delta = last.kg - first.kg;
      const distanceToGoal = goal.target_weight_kg - last.kg;
      const goingRightWay =
        (goal.goal_mode === 'weight_loss' && delta < 0) ||
        (goal.goal_mode === 'weight_gain' && delta > 0) ||
        (goal.goal_mode === 'maintain' && Math.abs(delta) < 1);
      insights.push({
        id: 'goal-weight-progress',
        priority: goingRightWay ? 'positive' : 'watch',
        eyebrow: 'Ziel-Fortschritt',
        title: goingRightWay
          ? 'Auf Kurs zum Zielgewicht'
          : 'Aktueller Verlauf zielt am Zielgewicht vorbei',
        explanation:
          Math.abs(distanceToGoal) < 0.1
            ? 'Zielgewicht praktisch erreicht.'
            : `Noch ${fmt1(Math.abs(distanceToGoal))} kg ${distanceToGoal < 0 ? 'unter' : 'über'} dem aktuellen Wert.`,
        evidence: [
          { label: 'Zielgewicht', value: `${fmt1(goal.target_weight_kg)} kg` },
          { label: 'Aktuell', value: `${fmt1(last.kg)} kg` },
          { label: 'Δ im Zeitraum', value: `${signed(delta)} kg` },
        ],
        methodology: 'Erster vs. letzter Messpunkt (manuell + Smart Scale) im Zeitraum.',
      });
    }
  }

  // -------- 4) Datenqualität: Messlücke --------
  if (periodScans.length >= 2) {
    const sorted = [...periodScans].sort(
      (a, b) => parseLocalDate(a.scan_date).getTime() - parseLocalDate(b.scan_date).getTime(),
    );
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = diffDaysInclusive(parseLocalDate(sorted[i - 1].scan_date), parseLocalDate(sorted[i].scan_date));
      if (gap > maxGap) maxGap = gap;
    }
    if (maxGap > 60) {
      insights.push({
        id: 'scan-gap',
        priority: 'watch',
        eyebrow: 'Datenqualität',
        title: `Messlücke von ${fmt0(maxGap)} Tagen zwischen zwei Scans`,
        explanation:
          'Große Lücken erschweren belastbare Trends. Ein regelmäßiger Rhythmus (z. B. 2–4 Wochen) macht die Analyse verlässlicher.',
        evidence: [
          { label: 'Größte Lücke', value: `${fmt0(maxGap)} Tage` },
          { label: 'Scans im Zeitraum', value: `${periodScans.length}` },
        ],
      });
    }
  }

  // -------- 5) Ohne Daten kein Statement --------
  if (insights.length === 0) {
    insights.push({
      id: 'no-data',
      priority: 'neutral',
      eyebrow: 'Kein Signal',
      title: 'Noch nicht genug Daten für eine belastbare Richtung',
      explanation:
        'Im gewählten Zeitraum liegen zu wenige Messungen vor. Wähle einen längeren Zeitraum oder ergänze Trainings-, Waage- oder Scan-Daten.',
      evidence: [
        { label: 'Trainings', value: `${periodCheckins.length}` },
        { label: 'Scans', value: `${periodScans.length}` },
        { label: 'Messungen', value: `${periodWeights.length + periodScale.length}` },
      ],
    });
  }

  // Sortierung: primary → positive → watch → neutral
  const order: InsightPriority[] = ['primary', 'positive', 'watch', 'neutral'];
  return insights.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));
}
