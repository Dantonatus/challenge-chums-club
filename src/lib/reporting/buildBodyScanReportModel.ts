import type { BodyScan } from '@/lib/bodyscan/types';
import type { HealthGoal } from '@/hooks/useHealthGoal';
import type { Period } from '@/lib/health/periods';
import { formatPeriodLabel, parseLocalDate } from '@/lib/health/periods';
import {
  buildBodyScanInsights,
  buildRecompositionBridge,
  scanComparability,
  compareScans,
  segmentSymmetry,
  formatGermanDate,
} from '@/lib/bodyscan/analytics';
import type { ReportModel, LineChartSpec, WaterfallSpec, KpiItem } from './types';
import { REPORT_COLORS, numDe, signed, fmtDateDe } from './reportFormatting';

export function buildBodyScanReportModel(params: {
  scans: BodyScan[];
  filteredScans: BodyScan[];
  currentScan: BodyScan | null;
  baselineScan: BodyScan | null;
  goal: HealthGoal | null;
  period: Period;
  updatedAt: Date | null;
}): ReportModel {
  const { filteredScans, currentScan, baselineScan, goal, period, updatedAt } = params;

  const insight = buildBodyScanInsights(currentScan, baselineScan, goal);
  const bridge = currentScan && baselineScan ? buildRecompositionBridge(currentScan, baselineScan) : null;
  const comparability = currentScan && baselineScan ? scanComparability(currentScan, baselineScan) : null;
  const deltas = currentScan && baselineScan ? compareScans(currentScan, baselineScan) : [];

  const kpis: KpiItem[] = [];
  if (currentScan) {
    if (currentScan.weight_kg != null) kpis.push({ label: 'Gewicht', value: `${numDe(currentScan.weight_kg)} kg`, delta: baselineScan && bridge?.available ? signed(bridge.weightDelta, 'kg') : null, deltaTone: bridge && bridge.weightDelta < 0 ? 'down' : bridge && bridge.weightDelta > 0 ? 'up' : 'neutral' });
    if (currentScan.fat_mass_kg != null) kpis.push({ label: 'Fettmasse', value: `${numDe(currentScan.fat_mass_kg)} kg`, delta: bridge?.available ? signed(bridge.fatDelta ?? 0, 'kg') : null, deltaTone: bridge && (bridge.fatDelta ?? 0) < 0 ? 'down' : 'up' });
    if (bridge?.available) kpis.push({ label: 'Fettfreie Masse', value: `${numDe((currentScan.weight_kg ?? 0) - (currentScan.fat_mass_kg ?? 0))} kg`, delta: signed(bridge.ffmDelta ?? 0, 'kg'), deltaTone: (bridge.ffmDelta ?? 0) >= 0 ? 'up' : 'down' });
    if (currentScan.fat_percent != null) kpis.push({ label: 'Körperfett', value: `${numDe(currentScan.fat_percent)} %` });
  }

  // ── Bridge chart ──
  const waterfall: WaterfallSpec | undefined = bridge?.available
    ? {
        kind: 'waterfall',
        steps: bridge.steps.map(s => ({ label: s.label, value: s.value, cumulative: s.cumulative, kind: s.kind })),
        unit: 'kg',
      }
    : undefined;

  // ── Small multiples: weight/fat/muscle over time ──
  const journeyChart: LineChartSpec | undefined = filteredScans.length >= 2
    ? {
        kind: 'line',
        yLabel: 'kg',
        series: [
          {
            name: 'Gewicht',
            color: REPORT_COLORS.weight,
            points: filteredScans
              .filter(s => s.weight_kg != null)
              .map(s => ({ x: parseLocalDate(s.scan_date).getTime(), y: s.weight_kg as number })),
          },
          {
            name: 'Fettmasse',
            color: REPORT_COLORS.fat,
            points: filteredScans
              .filter(s => s.fat_mass_kg != null)
              .map(s => ({ x: parseLocalDate(s.scan_date).getTime(), y: s.fat_mass_kg as number })),
          },
          {
            name: 'Muskelmasse',
            color: REPORT_COLORS.muscle,
            points: filteredScans
              .filter(s => s.muscle_mass_kg != null)
              .map(s => ({ x: parseLocalDate(s.scan_date).getTime(), y: s.muscle_mass_kg as number })),
          },
        ].filter(s => s.points.length >= 2),
        xTicks: buildDateTicks(filteredScans.map(s => parseLocalDate(s.scan_date).getTime())),
      }
    : undefined;

  // Anatomy / symmetry
  const symmetry = currentScan ? segmentSymmetry(currentScan, 'muscle') : null;
  const symmetryFat = currentScan ? segmentSymmetry(currentScan, 'fat') : null;

  const symmetryTableRows: string[][] = [];
  for (const p of symmetry ?? []) {
    symmetryTableRows.push([`Muskel ${p.label}`, `${numDe(p.left)} kg`, `${numDe(p.right)} kg`, `${signed(p.absDiff, 'kg')}`, `${numDe(p.pctAsymmetry, 1)} %`]);
  }
  for (const p of symmetryFat ?? []) {
    symmetryTableRows.push([`Fett ${p.label}`, `${numDe(p.left)} kg`, `${numDe(p.right)} kg`, `${signed(p.absDiff, 'kg')}`, `${numDe(p.pctAsymmetry, 1)} %`]);
  }

  const deltaTableRows = deltas
    .filter(d => d.current != null || d.baseline != null)
    .map(d => [
      d.label,
      d.baseline != null ? `${numDe(d.baseline)} ${d.unit}`.trim() : '–',
      d.current != null ? `${numDe(d.current)} ${d.unit}`.trim() : '–',
      d.abs != null ? signed(d.abs, d.unit) : '–',
      d.pct != null ? `${signed(d.pct)} %` : '–',
    ]);

  const baselineLabel = baselineScan ? `vs. ${formatGermanDate(baselineScan.scan_date)}` : 'kein Vergleichsscan';

  const tone = insight.tone === 'positive' ? 'positive' : insight.tone === 'watch' ? 'watch' : insight.tone === 'primary' ? 'primary' : 'neutral';

  return {
    kind: 'bodyscan',
    title: 'Body-Scan Bericht',
    subtitle: 'Recomposition Intelligence',
    period: {
      label: formatPeriodLabel(period),
      comparisonLabel: baselineScan ? `vs. Scan vom ${formatGermanDate(baselineScan.scan_date)}` : null,
    },
    generatedAt: new Date(),
    updatedAt,
    dataSources: [{ label: 'Scans im Zeitraum', count: filteredScans.length }],
    executiveSummary: {
      tone,
      headline: insight.headline,
      change: insight.explanation,
      goalStatus: goal?.goal_mode ? `Zielmodus: ${goal.goal_mode}.` : undefined,
      strongestSignal: insight.evidence.map(e => `${e.label}: ${e.value}`).join('  ·  '),
      watchout: comparability && comparability.confidence !== 'high'
        ? `Vergleichbarkeit ${comparability.confidence === 'medium' ? 'mittel' : 'gering'}: ${comparability.reasons.join(' ')}`
        : undefined,
      kpis,
    },
    sections: [
      ...(waterfall ? [{
        id: 'bridge',
        title: 'Composition Bridge',
        eyebrow: baselineLabel,
        summary: `Zerlegung der Gewichtsveränderung in Änderung Fettmasse und Änderung fettfreie Masse (Gewicht - Fettmasse). Muskelmasse ist Teilmenge der fettfreien Masse und wird nicht doppelt gezählt.`,
        chart: waterfall,
        bullets: bridge?.muscleHint != null ? [
          { label: 'Hinweis Änderung Muskelmasse', value: signed(bridge.muscleHint, 'kg') + ' (deskriptiv)' },
        ] : undefined,
        footnote: 'Vorsicht bei BIA-Messungen: Tageszeit, Hydration und Ernährung können Werte in der Größenordnung ±0,5 kg beeinflussen.',
      }] : []),
      ...(journeyChart ? [{
        id: 'journey',
        title: 'Verlauf im Zeitraum',
        eyebrow: 'Small Multiples',
        chart: journeyChart,
        summary: 'Absolute Verläufe von Gewicht, Fettmasse und Muskelmasse. Punkte markieren einzelne Scans.',
      }] : []),
      ...(symmetryTableRows.length ? [{
        id: 'symmetry',
        title: 'Anatomie & Symmetrie',
        eyebrow: 'Segment-Analyse',
        summary: 'Links/rechts-Vergleich für Arme und Beine im aktuellen Scan. Prozentuale Asymmetrie = |Differenz| / Maximum.',
        table: {
          columns: ['Segment', 'Links', 'Rechts', 'd.', 'Asymmetrie'],
          align: ['left', 'right', 'right', 'right', 'right'] as Array<'left' | 'right'>,
          rows: symmetryTableRows,
        },
        footnote: 'Segmentdaten stammen aus TANITA BIA-Messungen und unterliegen den gleichen Messschwankungen wie Gesamtwerte.',
      }] : []),
      ...(deltaTableRows.length ? [{
        id: 'deltas',
        title: 'Alle Deltas im Detail',
        eyebrow: baselineLabel,
        table: {
          columns: ['Kennzahl', 'Baseline', 'Aktuell', 'Änd. absolut', 'Änd. %'],
          align: ['left', 'right', 'right', 'right', 'right'] as Array<'left' | 'right'>,
          rows: deltaTableRows,
        },
      }] : []),
    ],
    methodology: [
      'Änderung Gewicht = Fettmasse-Anteil + fettfreie Masse-Anteil Masse (nicht überlappende Zerlegung).',
      'Fettfreie Masse = Gewicht − Fettmasse. Muskelmasse ist Teilmenge davon und wird nur als Kontext angezeigt.',
      'Vergleichs-Confidence berücksichtigt Gerätewechsel, Uhrzeit-Abweichung und Datenvollständigkeit.',
    ],
    dataQuality: comparability && comparability.reasons.length ? comparability.reasons : [],
    emptyReason: !currentScan
      ? 'Keine Scans im gewählten Zeitraum.'
      : !baselineScan
        ? 'Kein Vergleichsscan verfügbar - ein einzelner Scan liefert keine Recomposition-Aussage.'
        : undefined,
  };
}

function buildDateTicks(timestamps: number[]): Array<{ x: number; label: string }> {
  if (timestamps.length === 0) return [];
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const step = (max - min) / Math.min(6, timestamps.length - 1 || 1);
  const ticks: Array<{ x: number; label: string }> = [];
  for (let i = 0; i <= Math.min(6, timestamps.length - 1); i++) {
    const x = min + step * i;
    const d = new Date(x);
    ticks.push({ x, label: d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) });
  }
  return ticks;
}
