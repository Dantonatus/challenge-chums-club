
# Labels lesbar machen -- Hintergrund-Halo und gestaffelte Positionen

## Problem

Die `LabelList`-Labels (fontSize 9, halbtransparent) werden von Linien, Flaechen und anderen Datenpunkten ueberdeckt und sind schwer lesbar.

## Loesung

Einen **Custom Label Renderer** erstellen, der jeden Wert mit einem kleinen halbtransparenten Hintergrund-Rechteck ("Halo") rendert. Zusaetzlich werden Labels bei LineCharts und AreaCharts abwechselnd oben/unten positioniert, damit sie sich nicht gegenseitig verdecken.

## Aenderungen

### 1. Neuer Shared Helper: `src/components/bodyscan/ChartLabel.tsx`

- Eine React-Komponente `ChartLabel`, die als `content`-Prop fuer Recharts `<LabelList content={...} />` dient
- Rendert fuer jeden Datenpunkt:
  - Ein `<rect>` als Hintergrund (Farbe `hsl(var(--card))`, opacity 0.85, abgerundete Ecken)
  - Ein `<text>` mit dem Wert darueber (fontSize 9, Farbe passend zur Serie)
- Props: `color` (Textfarbe), `offsetY` (Versatz nach oben/unten, default -12)
- Ergebnis: Labels "schweben" auf einem kleinen undurchsichtigen Kaestchen ueber dem Datenpunkt und werden nie von Linien/Flaechen verdeckt

### 2. CompositionTrendChart.tsx

- Import `ChartLabel`
- Statt dem einfachen `<LabelList position="top" ...>` wird `<LabelList content={<ChartLabel color="..." />} />` verwendet
- Die drei Serien bekommen unterschiedliche `offsetY`-Werte (-14, -24, -34), damit sich "Gewicht", "Muskelmasse" und "Fettmasse" nicht ueberlagern

### 3. FatMuscleAreaChart.tsx

- Import `ChartLabel`
- Koerperfett-Label bekommt `offsetY={-14}`, Muskelmasse `offsetY={-26}` -- so liegen sie gestaffelt uebereinander statt aufeinander

### 4. SegmentMuscleChart.tsx + SegmentFatChart.tsx

- Import `ChartLabel`
- Hier reicht ein einheitlicher `offsetY={-12}`, da Bars nebeneinander stehen und sich weniger ueberlagern
- Der Halo-Hintergrund sorgt dafuer, dass Gridlines die Zahlen nicht durchschneiden

### Zusammenfassung

| Datei | Aenderung |
|---|---|
| `src/components/bodyscan/ChartLabel.tsx` | Neue shared Komponente -- Custom SVG Label mit Hintergrund-Rect |
| `CompositionTrendChart.tsx` | `LabelList content={ChartLabel}` mit gestaffeltem offsetY |
| `FatMuscleAreaChart.tsx` | `LabelList content={ChartLabel}` mit gestaffeltem offsetY |
| `SegmentMuscleChart.tsx` | `LabelList content={ChartLabel}` |
| `SegmentFatChart.tsx` | `LabelList content={ChartLabel}` |

Keine neuen Abhaengigkeiten noetig.
