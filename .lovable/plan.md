

# PDF-Export fuer Body Scan Seite

## Uebersicht

Die Body Scan Seite bekommt denselben PDF-Export-Mechanismus wie die Training Check-ins Seite: Screenshot-basierter Export aller Sektionen mit der bewaehrten `toJpeg` + `jsPDF`-Pipeline.

## Aenderungen

### 1. Neue Datei: `src/lib/bodyscan/exportBodyScanPDF.ts`

Kopie der bestehenden `exportTrainingPDF.ts`-Logik, angepasst fuer Body Scans:
- Header-Titel: "Body Scan Bericht" statt "Trainingsbericht"
- Datumsbereich aus `scan_date` statt `checkin_date`
- Dateiname: `bodyscan-report-YYYY-MM-DD.pdf`
- Gleiche Theme-Erkennung, Seitenumbruch-Logik und Footer

Die Funktion akzeptiert `BodyScan[]` und `sectionImages` -- identische Signatur wie bei Training.

### 2. Aenderung: `src/pages/app/training/BodyScanPage.tsx`

Gleicher Ansatz wie `TrainingPage.tsx`:

- **Imports**: `useRef`, `useState`, `toJpeg`, `Button`, `FileDown`, `Loader2`, `exportBodyScanPDF`
- **Refs**: 6 Refs fuer jede visuelle Sektion:
  - `kpiRef` -> BodyScanKPICards
  - `compositionRef` -> CompositionTrendChart
  - `fatMuscleRef` -> FatMuscleAreaChart
  - `segmentsRef` -> Segment-Grid (Muscle + Fat)
  - `metabolismRef` -> MetabolismCard
  - `timelineRef` -> ScanTimeline
- **pdfSections-Array**: Alle 6 Sektionen mit Label und Ref
- **handleExport**: Identische Capture-Logik (toJpeg mit 0.85 Qualitaet, 1.5x Pixel-Ratio, Theme-Background)
- **PDF-Button**: Im Header neben dem CSV-Import-Button, nur sichtbar wenn Scans vorhanden
- **Wrapper-Klassen**: Alle Ref-Divs behalten ihre bestehenden `-m-3 p-3` Klassen (bereits vorhanden)

### Keine weiteren Aenderungen noetig

- `exportTrainingPDF.ts` bleibt unveraendert
- Die Paginierungslogik wird 1:1 wiederverwendet
- Das `-m-3 p-3` Pattern ist bereits auf allen Sektionen der BodyScanPage

