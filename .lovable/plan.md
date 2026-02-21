

# PeriodNavigator erweitern + Body Scan integrieren

## 1. PeriodNavigator: "Jahr" hinzufuegen

Die bestehende `PeriodNavigator`-Komponente wird um einen vierten Modus **"Jahr"** erweitert:

| Modus | Label-Beispiel |
|-------|---------------|
| Woche | KW 8 · 17.–23. Feb 2026 |
| Monat | Februar 2026 |
| Quartal | Q1 2026 (Jan–Maer) |
| **Jahr** | **2026** |

Aenderungen in `src/components/weight/PeriodNavigator.tsx`:
- `PeriodMode` wird um `'year'` erweitert
- `computeRange`: neuer Case mit `startOfYear` / `endOfYear` / `addYears`
- `buildLabel`: neuer Case gibt z.B. "2026" zurueck
- ToggleGroup: viertes Segment "Jahr"

## 2. PeriodNavigator konfigurierbar machen

Da Body Scan keine woechentlichen Daten hat (Scans sind seltener), soll der Navigator die verfuegbaren Modi als Prop akzeptieren:

```text
interface Props {
  onChange: (start: Date, end: Date) => void;
  modes?: PeriodMode[];           // Default: ['week','month','quarter','year']
  defaultMode?: PeriodMode;       // Default: 'week'
}
```

- Gewicht nutzt weiterhin alle vier Modi (week/month/quarter/year), Default "week"
- Body Scan nutzt `modes={['month','quarter','year']}` mit Default "month"

## 3. Body Scan: Zeitraum-Filter integrieren

Aenderungen in `src/pages/app/training/BodyScanPage.tsx`:

- Neuer State: `periodStart` / `periodEnd`
- `PeriodNavigator` wird unterhalb des Scan-Navigators eingebaut (modes: month/quarter/year)
- Scans werden nach `scan_date` auf den Zeitraum gefiltert: `filteredScans`
- Alle Komponenten erhalten `filteredScans` statt `scans`:
  - `CompositionTrendChart`, `FatMuscleAreaChart`, `SegmentMuscleChart`, `SegmentFatChart` -- Chart-Daten auf Zeitraum begrenzt
  - `ScanTimeline` -- zeigt nur Scans im Zeitraum
- `BodyScanKPICards`, `AnatomyFigure`, `MetabolismCard` bleiben beim `selectedScan` (Einzelscan-Detail), aber der `selectedIndex` wird auf die gefilterten Scans umgestellt
- Der Scan-Navigator (Prev/Next Pfeile) navigiert nur innerhalb der gefilterten Scans

## 4. Betroffene Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/weight/PeriodNavigator.tsx` | "Jahr" hinzufuegen, `modes`/`defaultMode` Props |
| `src/pages/app/training/BodyScanPage.tsx` | PeriodNavigator einbauen, Scans filtern |
| `src/pages/app/training/WeightPage.tsx` | PeriodNavigator-Props anpassen (modes mit 'year') |

Keine neuen Dateien noetig -- die bestehende PeriodNavigator-Komponente wird wiederverwendet.

