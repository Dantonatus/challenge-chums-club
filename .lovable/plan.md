
## PDF-Export Qualitaetsverbesserung -- Training & Body Scan

### Analyse der aktuellen Probleme

**1. Verpixelung durch JPEG-Kompression**
- `toJpeg()` mit `quality: 0.85` erzeugt sichtbare Kompressionsartefakte, besonders bei Text und feinen Linien in Charts
- JPEG ist fuer Screenshots mit Text, scharfen Kanten und Farbverlaeufen grundsaetzlich das falsche Format

**2. Zu niedrige Aufloesung**
- `pixelRatio: 1.5` ist zu gering -- auf einem A4-PDF (210mm breit) ergibt das nur ~1240px Bildbreite
- Fuer scharfe Darstellung bei 150+ DPI braucht es mindestens `pixelRatio: 2`, ideal `3`

**3. Abschneiden / Clipping**
- Die 2-Spalten-Grid-Sektionen (z.B. "Frequenz & Ruhetage") werden auf die schmale A4-Content-Breite (182mm) komprimiert -- die Grid-Darstellung wird dabei stark gestaucht
- Breite Heatmaps und Kalender koennen horizontal abgeschnitten werden, wenn sie breiter als der Viewport sind

**4. Doppelte JPEG-Kompression**
- `toJpeg()` komprimiert beim Capture, dann wird das Bild nochmal als `'JPEG'` in jsPDF eingebettet -- doppelter Qualitaetsverlust

### Aenderungen

**Datei 1: `src/pages/app/training/TrainingPage.tsx`** -- Capture-Qualitaet erhoehen

- `toJpeg` ersetzen durch `toPng` (verlustfreies Format)
- `pixelRatio` von `1.5` auf `2.5` erhoehen (scharfe Darstellung auf Retina-Displays und im Druck)
- `quality`-Parameter entfaellt bei PNG
- Import aendern: `import { toPng } from 'html-to-image'` statt `toJpeg`

**Datei 2: `src/lib/training/exportTrainingPDF.ts`** -- PNG-Einbettung

- `doc.addImage(...)` Format von `'JPEG'` auf `'PNG'` aendern
- Eliminiert die zweite Kompressionsrunde

**Datei 3: `src/lib/bodyscan/exportBodyScanPDF.ts`** -- Gleiche Korrektur

- `doc.addImage(...)` Format ebenfalls auf `'PNG'` aendern
- Konsistenz ueber alle PDF-Exporte

**Datei 4: Body Scan Page** (falls vorhanden, gleicher Capture-Code)
- Ebenfalls `toJpeg` durch `toPng` und `pixelRatio: 2.5` ersetzen

### Zusammenfassung der Verbesserungen

| Aspekt | Vorher | Nachher |
|---|---|---|
| Capture-Format | JPEG (lossy) | PNG (lossless) |
| Pixel Ratio | 1.5x | 2.5x |
| PDF-Einbettung | JPEG (doppelt komprimiert) | PNG (verlustfrei) |
| Effektive DPI | ~90 | ~150 |

### Hinweis
Die PDF-Dateigroesse wird dadurch etwas zunehmen (ca. 2-4x), was aber fuer einen Report mit 5-7 Seiten absolut akzeptabel ist (typisch 3-8 MB statt 1-2 MB). Die Schaerfe-Verbesserung ist dafuer sofort sichtbar.
