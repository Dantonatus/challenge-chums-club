

# PDF-Export Fix: Dateigröße und Layout

## Probleme

1. **Datei zu groß (>20 MB)**: `pixelRatio: 2` erzeugt riesige PNG-Bilder. 9 Sektionen als unkomprimierte PNGs sprengen das Limit.
2. **Charts abgeschnitten/schlecht formatiert**: Die 2-Spalten-Grid-Charts werden einzeln gecaptured (halbe Breite), aber im PDF auf volle Breite gestreckt -- dadurch Verzerrung und Abschneidung.
3. **Layout stimmt nicht**: Seitenumbrüche passen nicht, weil die Bildgrößen nicht korrekt berechnet werden.

## Lösung

### 1. JPEG statt PNG + reduzierter pixelRatio

- `toPng` ersetzen durch `toJpeg` aus `html-to-image` (gleiche Bibliothek)
- `pixelRatio: 1.5` statt `2` (immer noch Druckqualität bei A4)
- JPEG-Qualität `0.85` -- reduziert Dateigröße um ca. 70-80% gegenüber PNG

### 2. Grid-Zeilen als Ganzes capturen

Statt 6 einzelne Chart-Refs (die jeweils nur eine Hälfte des Grids sind), werden die 3 Grid-Zeilen als Ganzes gecaptured. Das erhält das 2-Spalten-Layout exakt.

**Vorher (9 Refs, einzelne Charts):**
```
kpiRef -> KPI-Cards
heatmapRef -> TimeBubbleHeatmap  
recordsRef -> PersonalRecords
frequencyRef -> FrequencyTrend (halbe Breite!)
restDaysRef -> RestDays (halbe Breite!)
weeklyRef -> Weekly (halbe Breite!)
...
```

**Nachher (6 Refs, ganze Zeilen):**
```
kpiRef -> KPI-Cards (volle Breite)
heatmapRef -> TimeBubbleHeatmap (volle Breite)
recordsRef -> PersonalRecords (volle Breite)
gridRow1Ref -> Grid mit Frequenz + Ruhetage (volle Breite, 2 Spalten)
gridRow2Ref -> Grid mit Weekly + TimeDistribution (volle Breite, 2 Spalten)
gridRow3Ref -> Grid mit Weekday + Monthly (volle Breite, 2 Spalten)
```

### 3. Skalierung im PDF verbessern

- Bilder so skalieren, dass sie nie breiter als `CONTENT_W` (182mm) sind
- Maximale Bildhöhe pro Seite begrenzen, damit nichts abgeschnitten wird
- Bei Seitenumbruch: Hintergrund der neuen Seite ZUERST füllen, dann Bild platzieren

## Technische Änderungen

### `src/pages/app/training/TrainingPage.tsx`

- 9 Refs reduzieren auf 6 (3 Grid-Rows statt 6 einzelne Charts)
- Die `ref` direkt auf die `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` Wrapper setzen
- `toPng` ersetzen durch `toJpeg` mit `{ quality: 0.85, pixelRatio: 1.5 }`
- `pdfSections`-Array entsprechend anpassen

### `src/lib/training/exportTrainingPDF.ts`

- `addImage`-Format von `'PNG'` auf `'JPEG'` ändern
- Maximale Bildhöhe pro Seite einführen (z.B. `PAGE_H - 2 * MARGIN - 10`)
- Falls ein Bild zu hoch für eine Seite ist: auf maximale Höhe skalieren (Breite proportional reduzieren, zentriert platzieren)

