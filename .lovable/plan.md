

## PDF-Export Rework: Druckqualitaet bei vernuenftiger Dategroesse

### Problem
PNG bei 2.5x pixelRatio erzeugt riesige unkomprimierte Bilder. 7 Sektionen x ~3-10MB pro PNG = 75MB PDF. Das ist nicht praktikabel.

### Loesung: JPEG mit hoher Qualitaet + optimiertem pixelRatio

Der Sweet Spot fuer Druckqualitaet liegt bei **JPEG 0.92 Qualitaet** mit **pixelRatio 2**. Das ergibt:
- Scharfe, lesbare Texte und Charts (ca. 120 DPI auf A4)
- Dategroesse von 3-8 MB statt 75 MB
- Visuell kein Unterschied zu PNG bei Screenshots von UI-Elementen

### Aenderungen

**Datei 1: `src/pages/app/training/TrainingPage.tsx`**
- `toPng` zurueck zu `toJpeg` aendern (Import)
- `pixelRatio: 2` (statt 2.5)
- `quality: 0.92` hinzufuegen (hoch genug fuer Druckqualitaet, kein sichtbarer Verlust)

**Datei 2: `src/pages/app/training/BodyScanPage.tsx`**
- Gleiche Aenderung: `toPng` → `toJpeg`, `pixelRatio: 2`, `quality: 0.92`

**Datei 3: `src/lib/training/exportTrainingPDF.ts`**
- `doc.addImage(...)` Format von `'PNG'` auf `'JPEG'` aendern

**Datei 4: `src/lib/bodyscan/exportBodyScanPDF.ts`**
- `doc.addImage(...)` Format von `'PNG'` auf `'JPEG'` aendern

### Ergebnis

| Aspekt | Vorher (PNG) | Nachher (JPEG 0.92) |
|---|---|---|
| Dategroesse | ~75 MB | ~4-8 MB |
| Qualitaet | Verlustfrei (ueberdimensioniert) | Druckqualitaet (nicht unterscheidbar) |
| pixelRatio | 2.5x | 2x |
| DPI auf A4 | ~150 | ~120 |

JPEG-Artefakte sind bei `quality: 0.92` auf UI-Screenshots (Flaechen, Text, Charts) praktisch unsichtbar -- das ist der Standard den auch professionelle Report-Tools verwenden.

