

# PDF-Export: Theme-Matching und echte Diagramme

## Problem

Der aktuelle PDF-Export hat immer einen weissen Hintergrund mit blauen Akzenten und ersetzt die Diagramme durch Tabellen. Der User moechte, dass der PDF-Report exakt so aussieht wie die App -- also Dark/Light-Mode uebernimmt und die echten Diagramme (Charts) einbettet.

## Loesung

Die Recharts-Diagramme und UI-Komponenten werden per `html-to-image` (bereits installiert) als PNG-Bilder erfasst und direkt ins PDF eingebettet. Farben werden dynamisch aus dem aktuellen Theme gelesen.

## Technischer Ablauf

```text
User klickt "PDF Export"
  |
  +-- Theme erkennen (document.documentElement.classList.contains('dark'))
  +-- Farbpalette setzen (dark: dunkler Hintergrund, helle Schrift / light: umgekehrt)
  +-- Alle Chart-Container im DOM per Selektor finden
  +-- html-to-image: Jeden Chart-Container als PNG capturen
  +-- jsPDF: PDF aufbauen mit:
       - Seiten-Hintergrund passend zum Theme
       - KPI-Boxen mit Mint-Akzent (HSL 160 55% 45%) statt Blau
       - Gecapturte Chart-PNGs als eingebettete Bilder
       - Persoenliche Rekorde mit Theme-Farben
       - Footer
```

## Aenderungen

### 1. `src/lib/training/exportTrainingPDF.ts` -- Komplett ueberarbeiten

**Farbpalette dynamisch:**
- Light: Hintergrund weiss (#FCFCFC), Text dunkel (#1F1F1F), Accent Mint (#2F9B6E), KPI-Boxen helles Mint
- Dark: Hintergrund (#141414), Text hell (#EBEBEB), Accent Mint (#3FBB7E), KPI-Boxen dunkles Mint

**Neue Signatur:**
```typescript
export async function exportTrainingPDF(
  checkins: TrainingCheckin[],
  chartContainers?: HTMLElement[]  // optional: DOM-Elemente der Charts
)
```

**Ablauf:**
1. Theme aus DOM lesen
2. Farbkonstanten setzen (BG, FG, ACCENT, MUTED, CARD_BG)
3. Header-Balken in Mint statt Blau
4. KPI-Strip mit Theme-passenden Boxen
5. Bubble-Heatmap mit Theme-Farben (Mint-Bubbles auf dunklem/hellem Grund)
6. Personal Records mit Theme-Farben
7. Chart-Screenshots als Bilder einbetten (statt Tabellen)
8. Footer

### 2. `src/pages/app/training/TrainingPage.tsx` -- Chart-Capture-Logik

- Refs auf die Chart-Container-Divs setzen (oder IDs vergeben)
- Beim Klick auf "PDF Export": alle Chart-Container per `toPng()` aus `html-to-image` capturen
- Die PNGs zusammen mit den Checkins an `exportTrainingPDF()` uebergeben

**Konkret:**
- Wrapper-Div um den gesamten Chart-Bereich mit einer `ref` oder `id="training-charts"`
- Einzelne Sektionen mit `data-pdf-section="kpi"`, `data-pdf-section="heatmap"`, etc.
- `toPng()` fuer jede Sektion aufrufen
- Gesammelten Base64-PNGs an die Export-Funktion geben

### 3. Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/training/exportTrainingPDF.ts` | Komplette Ueberarbeitung: Theme-Erkennung, Mint-Farben, Chart-Bilder einbetten statt Tabellen |
| `src/pages/app/training/TrainingPage.tsx` | Refs/IDs an Chart-Sektionen, html-to-image Capture beim Export, async Handler |

### 4. Wichtige Details

- `exportTrainingPDF` wird `async` (wegen Bild-Capture)
- Bilder werden mit `doc.addImage(base64, 'PNG', x, y, w, h)` eingebettet
- Seitenumbrueche werden dynamisch berechnet basierend auf Bildhoehen
- Die KPI-Cards, Heatmap und Personal Records werden weiterhin programmatisch gezeichnet (da einfache Geometrie), aber in den richtigen Theme-Farben
- Die Recharts-Diagramme (FrequencyTrend, RestDays, WeeklyVisits, TimeDistribution, WeekdayHeatmap, MonthlyComparison) werden als Screenshots eingebettet
- Kalender wird nicht ins PDF aufgenommen (zu komplex, wenig Mehrwert im Print)

