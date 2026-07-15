# Performance Intelligence – Reporting Redesign

Umfangreiches Redesign des Reporting-Bereichs (`/app/training`, `/app/training/bodyscan`, `/app/training/weight`) zu einer gemeinsamen, datengetriebenen Shell mit Apple-inspirierter Ästhetik, echtem Zielsystem und deterministischen Insights.

## 1. Design Tokens (additiv)

**`src/index.css`** erweitern um HSL-Tokens (Light + Dark, kompatibel zu bestehendem System):
`--health-canvas`, `--health-surface`, `--health-surface-elevated`, `--health-ink`, `--health-ink-muted`, `--health-hairline`, `--health-glass`, `--health-observed`, `--health-positive`, `--health-muscle`, `--health-fat`, `--health-forecast`, `--health-warning`, `--health-danger`, `--health-grid`.

**`tailwind.config.ts`** um `health.*` Farb-Namespace erweitern. System-Font-Stack als eigene Utility (`font-health`: ui-sans-serif, -apple-system, ...). Keine externe Schrift.

Bestehende `--primary`/shadcn-Tokens bleiben unangetastet. Reporting-Styles gekapselt via Komponenten + `.health-*` Klassen.

## 2. Zielsystem (Backend)

Neue Migration `health_goals`:
- Spalten: `goal_mode` (enum-artig via CHECK: weight_loss|weight_gain|maintain|recomposition|training_consistency), `target_weight_kg`, `target_body_fat_percent`, `weekly_training_target`, `target_date`, `is_active`, Standard-Timestamps
- Partial-unique-Index: max. 1 aktives Ziel pro `user_id`
- GRANT `SELECT,INSERT,UPDATE,DELETE` an `authenticated`, `ALL` an `service_role`
- RLS: 4 Policies (select/insert/update/delete) je `auth.uid() = user_id`
- Update-Trigger für `updated_at`

**`src/hooks/useHealthGoal.ts`** – TanStack Query + Upsert-Mutation.

## 3. Shared Reporting-Layer

Neuer Ordner `src/components/health/`:
- `PerformanceReportingShell.tsx` – Canvas + Header + Subnav + Slot
- `ReportingHeader.tsx` – Eyebrow, Titel, dynamischer Kontextsatz, Zeitraum-Steuerung, Vergleichs-Toggle, DataFreshness, Actions
- `ReportingSubnav.tsx` – Segmented Nav (Übersicht/Training/Körper/Gewicht), mobile horizontal scroll
- `ExecutiveBrief.tsx` – zeigt 1 primary + 2 sekundäre Insights, "Alle Erkenntnisse"-Sheet
- `JourneyHero.tsx` – Ziel-Fortschritt (Progress zu Target), Empty State "Ziel definieren"
- `MetricHero.tsx` – Große Kennzahl mit Delta + Sparkline
- `InsightRow.tsx` – Einzelinsight mit Icon, Evidence, optional Action
- `ChartFrame.tsx` – Konsistenter Karten-Rahmen (Radius, Hairline, Titel, Legende, MethodologySheet-Trigger)
- `ComparisonPill.tsx` – "+2,3 kg vs. Vorperiode"
- `DataFreshness.tsx` – "Aktualisiert 10. Apr. 2026 · 4 Scans"
- `ConfidenceBadge.tsx` – hoch/mittel/niedrig basierend auf Datenmenge
- `MethodologySheet.tsx` – Formeln/Quellen offenlegen
- `GoalEditorSheet.tsx` – Ziel anlegen/bearbeiten
- `EmptyInsightState.tsx` – kompakte Erklärung statt leerer Chart

**`src/contexts/ReportingContext.tsx`** – gemeinsamer Zustand:
- `period: { start, end, mode }` (mit Presets 4W/12W/6M/YTD/1Y/Custom)
- `comparison: 'previous' | 'start' | 'none'`
- `referenceDate` = min(period.end, letztes Datum in Daten)
- `previousPeriod` = exakt gleiche Länge
- Zeitzone Europe/Berlin

## 4. Deterministische Insights

**`src/lib/health/executiveInsights.ts`** – Pure Funktion `computeInsights({ checkins, scans, weights, smartScale, goal, period, comparison }) => Insight[]`.

Regeln (Auszug):
- Recomposition: Gewicht ↑, Muskelmasse ↑, Fettmasse ↓ → positive Insight
- Frequenz-Delta: letzte 4W abgeschlossene vs. vorherige 4W (nur wenn Perioden vollständig)
- Gewichtstrend zu Ziel: linearer Fit → prognostiziertes Zieldatum, warnen wenn außerhalb `target_date`
- Datenqualität: Lücke > 30 Tage in Scans → watch
- Unterdaten: < 3 Messungen im Zeitraum → keine Trendbehauptung
- Jede Insight enthält `evidence[]` mit konkreten Zahlen und optional `methodology`

Keine medizinischen Aussagen. Kein Composite-Score ohne offengelegte Formel.

## 5. Seiten-Refactor

- **`/app/training`** (`TrainingPage.tsx`), **`/bodyscan`** (`BodyScanPage.tsx`), **`/weight`** (`WeightPage.tsx`) werden auf `PerformanceReportingShell` umgestellt. Bestehende Header (Titel + 3 Toggle-Buttons + Import/Export) werden entfernt und in Shell/Subnav konsolidiert.
- **Neue Route `/app/training/overview`** als Landing der Shell (Übersicht mit ExecutiveBrief + JourneyHero + Cross-Domain-Kompaktkarten).
- Bestehende Charts (`TrainingKPICards`, `WeeklyVisitsChart`, `BodyScanKPICards`, `WeightTerrainChart`, etc.) bleiben, werden aber in `ChartFrame` gewrapt und respektieren den globalen Zeitraum aus `ReportingContext`.
- Import (CSV/PDF), Export (PDF), Auth, Datenhooks: unverändert.

## 6. Datums-/Vergleichslogik

**`src/lib/health/periods.ts`** – Helfer:
- `resolveReferenceDate(period, latestDataDate)`
- `getPreviousPeriod(period)` – exakt gleiche Länge
- `isPeriodComplete(period, now)` – markiert unvollständige laufende W/M
- Alle Datums-Operationen via `parseLocalDate`/`Europe/Berlin`

## 7. Responsive & States

- Desktop: 12-col Bento (Hero 8, Journey 4)
- Tablet: 2-col
- Mobile: 1-col, sticky kompakter Period-Chip, Touch ≥ 44px
- Loading: Shimmer-Skeletons in `--health-surface`
- Empty/Partial/Error: `EmptyInsightState` mit Kontext

## 8. Verifikation

- `npm run build` grün
- Manuell prüfen: Light/Dark, 390/768/1440
- Bestehende Import- und Export-Flows funktionieren

## Datei-Übersicht

**Neu (~18):** Migration `health_goals`, `useHealthGoal.ts`, 14 Health-Komponenten, `ReportingContext.tsx`, `executiveInsights.ts`, `periods.ts`, `Overview.tsx`
**Geändert:** `index.css`, `tailwind.config.ts`, `TrainingPage.tsx`, `BodyScanPage.tsx`, `WeightPage.tsx`, `App.tsx` (Route)

## Nicht enthalten

- Redesign der App-Navigation außerhalb Reporting
- Änderungen an Auth/Import-Pipeline
- Neue Chart-Bibliothek (Recharts bleibt)

## Umsetzung in Etappen

Wegen des Umfangs schlage ich vor, in zwei Runden zu shippen:
1. **Runde 1 (dieser Turn):** Tokens, Migration+Goal-Hook, Shell/Header/Subnav/Context/Insights-Engine, Overview-Route, minimales Einbinden der 3 Seiten in die Shell (Header ersetzt), Build grün.
2. **Runde 2 (Folge-Turn):** Feinschliff aller Charts in `ChartFrame`, MethodologySheets, Journey-Progress-Visualisierung, Mobile-Politur.

Bestätige, ob ich Runde 1 direkt starten soll — oder ob du zuerst Runde 1+2 in einem Guss willst (deutlich mehr Änderungen in einem Schritt, höheres Regressionsrisiko).