// Shared report model — fully serializable, UI-independent.
// A ReportModel is built from analytics data and then rendered to PDF
// by src/lib/reporting/renderReportPdf.ts. No React / DOM required.

export type ReportKind = 'training' | 'bodyscan' | 'weight';
export type SectionTone = 'primary' | 'positive' | 'watch' | 'neutral';

export interface ReportPeriodMeta {
  label: string;                 // "01. Mai 2026 – 30. Jul 2026"
  comparisonLabel: string | null; // "vs. Vorperiode" | "vs. 02. Feb 2026"
}

export interface KpiItem {
  label: string;
  value: string;         // pre-formatted
  hint?: string | null;  // small secondary line
  delta?: string | null; // "+0,4 kg", "+12 %"
  deltaTone?: 'up' | 'down' | 'neutral';
}

export interface BulletItem {
  label: string;
  value: string;
}

export interface TableModel {
  columns: string[];
  rows: string[][];
  align?: Array<'left' | 'right' | 'center'>;
}

// ── Chart primitives ────────────────────────────────────────────────
export interface LineSeries {
  name: string;
  color: string;                 // hex
  points: Array<{ x: number; y: number }>;
  dashed?: boolean;
  fill?: boolean;                // simple area fill under line
}

export interface LineChartSpec {
  kind: 'line';
  xLabels?: string[];            // categorical x labels (evenly spaced) OR use series x directly
  xTicks?: Array<{ x: number; label: string }>; // explicit ticks (used when x is numeric)
  yLabel?: string;
  yDomain?: [number, number];
  series: LineSeries[];
  markers?: Array<{ x: number; y: number; label?: string; color?: string }>;
  hLines?: Array<{ y: number; label: string; color: string; dashed?: boolean }>;
  bands?: Array<{ x0: number; x1: number; y0: number; y1: number; color: string; alpha?: number }>;
}

export interface BarChartSpec {
  kind: 'bar';
  bars: Array<{ label: string; value: number; color?: string; isTarget?: boolean }>;
  targetLine?: { y: number; label: string; color: string };
  yLabel?: string;
}

export interface WaterfallSpec {
  kind: 'waterfall';
  steps: Array<{ label: string; value: number; cumulative: number; kind: 'anchor' | 'positive' | 'negative' }>;
  unit: string;
}

export type ChartSpec = LineChartSpec | BarChartSpec | WaterfallSpec;

// ── Report sections ─────────────────────────────────────────────────
export type SectionId = string;

export interface ReportSection {
  id: SectionId;
  title: string;
  required?: boolean;            // Executive Summary → always true
  eyebrow?: string;
  summary?: string;              // short paragraph
  bullets?: BulletItem[];
  kpis?: KpiItem[];
  chart?: ChartSpec;
  table?: TableModel;
  footnote?: string;             // methodology / disclaimer
  minHeightMm?: number;          // hint for pagination
}

export interface ReportModel {
  kind: ReportKind;
  title: string;                 // "Trainingsbericht"
  subtitle?: string;             // "Konsistenz & Rhythmus"
  period: ReportPeriodMeta;
  generatedAt: Date;
  updatedAt: Date | null;        // Datenstand
  dataSources: Array<{ label: string; count: number }>;
  executiveSummary: {
    tone: SectionTone;
    headline: string;
    change?: string;              // "Was hat sich verändert?"
    goalStatus?: string;
    strongestSignal?: string;
    watchout?: string;
    kpis: KpiItem[];
  };
  sections: ReportSection[];
  methodology: string[];         // bullet list of methodology notes
  dataQuality: string[];         // caveats / warnings
  emptyReason?: string;          // when set, model is empty and cannot be rendered
}

export interface RenderOptions {
  enabledSectionIds: Set<SectionId>;
  onProgress?: (label: string, pct: number) => void;
}

export interface RenderResult {
  filename: string;
  blob: Blob;
  pageCount: number;
  chartCount: number;
}
