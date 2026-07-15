import type { WeightEntry } from '@/lib/weight/types';
import type { HealthGoal } from '@/hooks/useHealthGoal';
import type { Period } from '@/lib/health/periods';
import { formatPeriodLabel, parseLocalDate } from '@/lib/health/periods';
import { movingAverage, forecast, allTimeExtremes, volatility, weeklyChange } from '@/lib/weight/analytics';
import type { ReportModel, LineChartSpec, KpiItem } from './types';
import { REPORT_COLORS, numDe, signed, fmtDateDe } from './reportFormatting';

export function buildWeightReportModel(params: {
  entries: WeightEntry[];       // unified entries in period
  allEntries: WeightEntry[];    // full history (for forecast baseline)
  hasScaleContext: boolean;
  goal: HealthGoal | null;
  period: Period;
  updatedAt: Date | null;
}): ReportModel {
  const { entries, allEntries, hasScaleContext, goal, period, updatedAt } = params;

  if (entries.length === 0) {
    return {
      kind: 'weight',
      title: 'Gewichtsbericht',
      subtitle: 'Trend, Ziel und Projektion',
      period: { label: formatPeriodLabel(period), comparisonLabel: null },
      generatedAt: new Date(),
      updatedAt,
      dataSources: [{ label: 'Messungen', count: 0 }],
      executiveSummary: {
        tone: 'neutral',
        headline: 'Keine Messungen im gewählten Zeitraum.',
        kpis: [],
      },
      sections: [],
      methodology: [],
      dataQuality: [],
      emptyReason: 'Keine Gewichts-Messungen im gewählten Zeitraum. Trage einen Wert ein oder wähle einen längeren Zeitraum.',
    };
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const ma = movingAverage(sorted, 7);
  const smoothed = ma[ma.length - 1]?.avg ?? last.weight_kg;
  const startSmoothed = ma[0]?.avg ?? first.weight_kg;
  const deltaPeriod = smoothed - startSmoothed;

  const targetKg = goal?.target_weight_kg ?? null;
  const gapToGoal = targetKg != null ? smoothed - targetKg : null;
  const swing = volatility(sorted, 14);
  const wChange = weeklyChange(sorted);

  // Pace: kg per week over recent 4 weeks (regression on smoothed line)
  let pacePerWeek: number | null = null;
  const recentMa = ma.slice(-28);
  if (recentMa.length >= 4) {
    const y = recentMa.map(m => m.avg);
    const n = y.length;
    const xs = y.map((_, i) => i);
    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = y.reduce((s, v) => s + v, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (y[i] - meanY); den += (xs[i] - meanX) ** 2; }
    pacePerWeek = den > 0 ? (num / den) * 7 : 0;
  }

  // Forecast (use full history for stability, then plot only projected range)
  const fc = forecast(allEntries, 21);

  const projectionEnabled = allEntries.length >= 10 && swing < 1.5;
  const eta = (targetKg != null && pacePerWeek != null && Math.abs(pacePerWeek) > 0.05 && Math.sign(pacePerWeek) === Math.sign(targetKg - smoothed))
    ? Math.abs(gapToGoal! / pacePerWeek)
    : null;
  const etaLabel = eta != null && projectionEnabled && eta <= 52
    ? `~${numDe(eta, 0)} Wochen bei aktueller Pace`
    : null;

  const kpis: KpiItem[] = [
    {
      label: 'Aktuell (geglättet)',
      value: `${numDe(smoothed)} kg`,
      hint: `Einzelwert: ${numDe(last.weight_kg)} kg (${fmtDateDe(last.date)})`,
    },
    {
      label: 'Δ im Zeitraum',
      value: signed(deltaPeriod, 'kg'),
      deltaTone: deltaPeriod < 0 ? 'down' : deltaPeriod > 0 ? 'up' : 'neutral',
    },
    targetKg != null
      ? {
          label: 'Zielabstand',
          value: signed(gapToGoal!, 'kg'),
          hint: `Ziel ${numDe(targetKg)} kg`,
        }
      : {
          label: 'Wochenänderung',
          value: wChange != null ? signed(wChange, 'kg') : '–',
        },
    {
      label: 'Pace (4 W)',
      value: pacePerWeek != null ? signed(pacePerWeek, 'kg/W') : '–',
      hint: etaLabel ?? undefined,
    },
  ];

  // ── Main chart: measured + smoothed + goal + projection ────────────
  const ts = (d: string) => parseLocalDate(d).getTime();
  const measuredPoints = sorted.map(e => ({ x: ts(e.date), y: e.weight_kg }));
  const smoothedPoints = ma.map(m => ({ x: ts(m.date), y: m.avg }));

  const projectionPoints = projectionEnabled
    ? fc.points.slice(0, 21).map(p => ({ x: ts(p.date), y: p.value }))
    : [];
  const projectionUpper = projectionEnabled ? fc.points.map(p => ({ x: ts(p.date), y: p.upper })) : [];
  const projectionLower = projectionEnabled ? fc.points.map(p => ({ x: ts(p.date), y: p.lower })) : [];

  const allXs = [...measuredPoints, ...projectionPoints].map(p => p.x);
  const xMin = Math.min(...allXs), xMax = Math.max(...allXs);

  const mainChart: LineChartSpec = {
    kind: 'line',
    yLabel: 'kg',
    series: [
      { name: 'Messungen', color: REPORT_COLORS.hairline, points: measuredPoints, dashed: false },
      { name: '7-Tage Ø', color: REPORT_COLORS.weight, points: smoothedPoints },
      ...(projectionPoints.length ? [{
        name: 'Projektion (Modell)',
        color: REPORT_COLORS.projection,
        points: projectionPoints,
        dashed: true,
      }] : []),
    ],
    hLines: targetKg != null
      ? [{ y: targetKg, label: `Ziel ${numDe(targetKg)} kg`, color: REPORT_COLORS.goal, dashed: true }]
      : [],
    bands: projectionUpper.length && projectionLower.length
      ? projectionUpper.map((u, i) => ({
          x0: u.x, x1: u.x,
          y0: projectionLower[i].y, y1: u.y,
          color: REPORT_COLORS.projection, alpha: 0.12,
        })).slice(0, 1).concat([{
          x0: Math.min(...projectionUpper.map(p => p.x)),
          x1: Math.max(...projectionUpper.map(p => p.x)),
          y0: Math.min(...projectionLower.map(p => p.y)),
          y1: Math.max(...projectionUpper.map(p => p.y)),
          color: REPORT_COLORS.projection, alpha: 0.10,
        }])
      : [],
    xTicks: buildDateTicks(xMin, xMax),
  };

  const extremes = allTimeExtremes(sorted);

  return {
    kind: 'weight',
    title: 'Gewichtsbericht',
    subtitle: 'Verlauf, Ziel und Projektion',
    period: { label: formatPeriodLabel(period), comparisonLabel: 'Startwert im Zeitraum' },
    generatedAt: new Date(),
    updatedAt,
    dataSources: [
      { label: 'Messungen im Zeitraum', count: entries.length },
      ...(hasScaleContext ? [{ label: 'Smart-Scale-Kontext', count: 1 }] : []),
    ],
    executiveSummary: {
      tone: targetKg != null
        ? (Math.abs(gapToGoal!) < 0.5 ? 'positive' : (pacePerWeek != null && Math.sign(pacePerWeek) === Math.sign(targetKg - smoothed) ? 'primary' : 'watch'))
        : (Math.abs(deltaPeriod) < 0.5 ? 'neutral' : 'primary'),
      headline: targetKg != null
        ? `Aktuell ${numDe(smoothed)} kg - Zielabstand ${signed(gapToGoal!, 'kg')}.`
        : `Aktuell ${numDe(smoothed)} kg (geglättet) - Δ ${signed(deltaPeriod, 'kg')} im Zeitraum.`,
      change: `Startwert (7-Tage Ø) ${numDe(startSmoothed)} kg → aktuell ${numDe(smoothed)} kg (${signed(deltaPeriod, 'kg')}). Streuung der letzten 14 Tage: ${numDe(swing, 2)} kg.`,
      goalStatus: targetKg != null
        ? `Ziel: ${numDe(targetKg)} kg. Aktuelle Pace: ${pacePerWeek != null ? signed(pacePerWeek, 'kg/W') : '–'}${etaLabel ? ` (${etaLabel})` : ''}.`
        : 'Kein Gewichtsziel gesetzt.',
      strongestSignal: pacePerWeek != null
        ? `Trend über die letzten 4 Wochen: ${signed(pacePerWeek, 'kg/W')}.`
        : undefined,
      watchout: swing >= 1.0
        ? `Hohe Streuung (${numDe(swing, 2)} kg). Signal < Rauschen - Trendaussagen mit Vorsicht.`
        : undefined,
      kpis,
    },
    sections: [
      {
        id: 'trajectory',
        title: 'Verlauf & Ziel-Trajektorie',
        eyebrow: 'Signal vs. Rauschen',
        summary: 'Rohe Messungen dünn im Hintergrund, 7-Tage-Mittel als geglätteter Verlauf. Ziel-Linie und Projektionsband sind visuell getrennt.',
        chart: mainChart,
        footnote: projectionEnabled
          ? 'Projektion basiert auf einem gedämpften Holt-Winters-Modell auf Basis deiner gesamten Historie. Sie ist eine Modellschätzung, kein Vorhersagewert.'
          : 'Projektion ausgeblendet: zu wenig Daten oder zu hohe Streuung für eine belastbare Schätzung.',
      },
      {
        id: 'facts',
        title: 'Fakten & Extremwerte',
        eyebrow: 'Zusammenfassung',
        bullets: [
          { label: 'Erster Wert im Zeitraum', value: `${numDe(first.weight_kg)} kg (${fmtDateDe(first.date)})` },
          { label: 'Letzter Wert', value: `${numDe(last.weight_kg)} kg (${fmtDateDe(last.date)})` },
          { label: 'Höchster Wert', value: extremes.max ? `${numDe(extremes.max.weight)} kg (${fmtDateDe(extremes.max.date)})` : '–' },
          { label: 'Niedrigster Wert', value: extremes.min ? `${numDe(extremes.min.weight)} kg (${fmtDateDe(extremes.min.date)})` : '–' },
          { label: 'Streuung (14 Tage)', value: `${numDe(swing, 2)} kg` },
          { label: 'Wochen-Δ (letzte 7 Tage)', value: wChange != null ? signed(wChange, 'kg') : '–' },
        ],
      },
    ],
    methodology: [
      '7-Tage gleitendes Mittel glättet Tagesschwankungen.',
      'Pace = lineare Regression des geglätteten Verlaufs über die letzten 28 Tage.',
      'Projektion: gedämpftes Holt-Winters-Modell auf gesamter Historie.',
    ],
    dataQuality: [
      entries.length < 10 ? 'Weniger als 10 Messungen im Zeitraum - Trend nur eingeschränkt aussagekräftig.' : '',
      swing >= 1.0 ? `Hohe Streuung (${numDe(swing, 2)} kg) - Aussagen zur Pace mit Vorsicht.` : '',
    ].filter(Boolean),
  };
}

function buildDateTicks(min: number, max: number): Array<{ x: number; label: string }> {
  const ticks: Array<{ x: number; label: string }> = [];
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const x = min + ((max - min) * i) / steps;
    ticks.push({ x, label: new Date(x).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }) });
  }
  return ticks;
}
