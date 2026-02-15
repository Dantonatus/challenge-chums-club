

# Datenwerte auf Body-Scan-Grafiken anzeigen

## Ziel

Ein globaler Toggle-Button auf der Body-Scan-Seite, der auf allen Grafiken kleine, halbtransparente Zahlenlabels an den Datenpunkten ein- und ausblendet. So sind Unterschiede zwischen Scans sofort ablesbar, ohne auf jeden Punkt hovern zu muessen.

## Umsetzung

### 1. BodyScanPage.tsx -- globaler State + Button

- Neuer State: `const [showLabels, setShowLabels] = useState(false)`
- Ein kleiner Toggle-Button (z.B. Icon `Hash` oder `Eye` aus lucide) neben dem PDF-Button in der Header-Leiste
- `showLabels` wird als Prop an alle Chart-Komponenten weitergereicht

### 2. CompositionTrendChart.tsx -- Labels auf LineChart

- Neue Prop `showLabels?: boolean`
- Auf jeder `<Line>` wird ein `<LabelList>` ergaenzt, das nur gerendert wird wenn `showLabels` aktiv ist
- Styling: `fontSize: 9`, `fill` passend zur jeweiligen Linienfarbe, `fillOpacity: 0.6`, Position `top`
- Recharts `<LabelList dataKey="Gewicht" position="top" ... />` etc.

### 3. FatMuscleAreaChart.tsx -- Labels auf AreaChart

- Gleiche Prop `showLabels?: boolean`
- `<LabelList>` auf jeder `<Area>`, Position `top`, gleiche transparente Schriftgroesse
- Koerperfett-Label links, Muskelmasse-Label rechts positioniert

### 4. SegmentMuscleChart.tsx + SegmentFatChart.tsx -- Labels auf BarChart

- Prop `showLabels?: boolean`
- `<LabelList>` auf jeder `<Bar>`, Position `top`, fontSize 9, halbtransparent

### 5. Zusammenfassung der Aenderungen

| Datei | Aenderung |
|---|---|
| `BodyScanPage.tsx` | State `showLabels`, Toggle-Button, Prop-Weitergabe an 4 Charts |
| `CompositionTrendChart.tsx` | Prop + bedingte `LabelList` auf 3 Lines |
| `FatMuscleAreaChart.tsx` | Prop + bedingte `LabelList` auf 2 Areas |
| `SegmentMuscleChart.tsx` | Prop + bedingte `LabelList` auf 1-2 Bars |
| `SegmentFatChart.tsx` | Prop + bedingte `LabelList` auf 1-2 Bars |

Keine neuen Abhaengigkeiten -- `LabelList` ist bereits Teil von Recharts.
