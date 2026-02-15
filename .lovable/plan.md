

# Chart-Labels Rework -- Lesbarkeit und Groesse

## Probleme

1. **Segment-Charts (Muskel + Fett)**: Labels werden von den dunklen Bars ueberlagert -- die Halo-Box mit 0.85 Opacity reicht im Dark Mode nicht, weil `hsl(var(--card))` selbst dunkel ist und mit den Bars verschmilzt
2. **Koerperfett vs. Muskelmasse (AreaChart)**: Blaue Zahl kann unter die blaue Flaeche rutschen, rote Zahl wird ebenfalls ueberdeckt
3. **Segment-Charts zu klein**: Bei 280px Hoehe ist zu wenig Platz fuer Labels oberhalb der Bars

## Aenderungen

### 1. ChartLabel.tsx -- Robusterer Halo

- `fillOpacity` der Hintergrund-Box von 0.85 auf **0.95** erhoehen
- Einen subtilen **Stroke** (1px, `hsl(var(--border))`) um die Box hinzufuegen, damit sie sich auch im Dark Mode klar vom Hintergrund abhebt
- Text `fillOpacity` von 0.8 auf **0.9** fuer bessere Lesbarkeit

### 2. FatMuscleAreaChart.tsx -- Labels weiter nach oben

- Beide Labels weiter vom Datenpunkt weg positionieren: Fat `offsetY: -18`, Muscle `offsetY: -34`
- Chart-Hoehe von 280 auf **340px** erhoehen, damit oben genug Platz fuer die gestaffelten Labels bleibt
- Top-Margin im AreaChart erhoehen (`margin={{ top: 40 }}`)

### 3. CompositionTrendChart.tsx -- Mehr Platz oben

- Chart-Hoehe von 280 auf **340px**
- `margin={{ top: 45 }}` damit die drei gestaffelten Labels (-14, -26, -38) nicht abgeschnitten werden

### 4. SegmentMuscleChart.tsx + SegmentFatChart.tsx -- Groesser + Labels hoeher

- Chart-Hoehe von 280 auf **340px**
- `margin={{ top: 30 }}` fuer Platz ueber den Bars
- "Aktuell"-Label `offsetY: -16`, "Vorher"-Label `offsetY: -16` (Bars stehen nebeneinander, kein Staffeln noetig)
- Durch die hoeheren Offsets + groessere Charts + robusteren Halo sind die Zahlen klar ueber den Bars sichtbar

### Zusammenfassung

| Datei | Aenderung |
|---|---|
| `ChartLabel.tsx` | Opacity 0.95, Stroke-Border, Text-Opacity 0.9 |
| `FatMuscleAreaChart.tsx` | Hoehe 340px, margin top 40, offsetY -18/-34 |
| `CompositionTrendChart.tsx` | Hoehe 340px, margin top 45 |
| `SegmentMuscleChart.tsx` | Hoehe 340px, margin top 30, offsetY -16 |
| `SegmentFatChart.tsx` | Hoehe 340px, margin top 30, offsetY -16 |
