

## PDF-Export fuer Gewicht-Seite

Dieselbe Architektur wie beim Training Check-in Export wird auf die Gewicht-Seite uebertragen: Screenshot-Capture der sichtbaren Sektionen mit `toJpeg` und Zusammenstellung via `jsPDF`.

### Neue Datei: `src/lib/weight/exportWeightPDF.ts`

Kopie der Logik aus `exportTrainingPDF.ts`, angepasst fuer den Gewichts-Kontext:
- Header-Text: "Gewichtsbericht" statt "Trainingsbericht"
- Dateiname: `gewicht-report-YYYY-MM-DD.pdf`
- Gleiche Theme-aware Farben, Seitenumbruch-Logik (60mm Schwelle), Footer mit Seitenzahlen
- Akzeptiert `sectionImages: { label: string; dataUrl: string }[]` -- identische Signatur

### Aenderungen in `src/pages/app/training/WeightPage.tsx`

1. **Imports hinzufuegen**: `toJpeg` aus `html-to-image`, `useRef`, `useState` fuer Export-State, `FileDown`, `Loader2` Icons, `Button`, neue `exportWeightPDF` Funktion

2. **Refs fuer alle sichtbaren Sektionen** (nur Uebersicht-Tab, da dieser die Hauptdaten zeigt):
   - `kpiRef` → WeightKPICards
   - `entryListRef` → WeightEntryList
   - `comparisonRef` → DailyComparisonCard (nur wenn Scale-Daten vorhanden)
   - `terrainRef` → WeightTerrainChart
   - `heatmapRef` → WeightHeatmapStrip

3. **Export-Handler**: Iteriert ueber alle Refs, erfasst JPEG-Screenshots (pixelRatio 2, quality 0.92, theme-aware Hintergrundfarbe), uebergibt sie an `exportWeightPDF`

4. **PDF-Button im Header**: Neben dem ScaleFileUploader, analog zum Training-Export (nur sichtbar wenn Daten vorhanden)

5. **Capture-Buffer**: Alle erfassten Sektionen erhalten `-m-5 p-5` Wrapper fuer saubere Schatten/Border-Erfassung

### Technische Details

```text
WeightPage Header
  [Check-ins] [Body Scan] [Gewicht]    [PDF Export] [Import]
                                         ^-- NEU

Capture-Refs (Uebersicht-Tab):
  kpiRef        → WeightKPICards
  entryListRef  → WeightEntryList  
  comparisonRef → DailyComparisonCard (optional)
  terrainRef    → WeightTerrainChart
  heatmapRef    → WeightHeatmapStrip
```

Die Export-Funktion ist identisch zur Training-Variante: JPEG 0.92 Qualitaet, pixelRatio 2, intelligente Seitenumbrueche, Theme-aware Hintergrund.

