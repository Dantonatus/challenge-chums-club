

## Granularere Y-Achsen fuer Body Scan Charts

### Problem
Beide Charts nutzen die Standard-Y-Achse von Recharts, die bei 0 beginnt. Bei Werten wie Gewicht ~92-96 kg oder Muskelmasse ~72-75 kg sehen die Kurven dadurch extrem flach aus — kleine, aber wichtige Aenderungen von 1-3 kg sind kaum sichtbar.

### Loesung
Die Y-Achsen werden auf den tatsaechlichen Wertebereich der Daten zugeschnitten ("tight domain"), mit etwas Puffer oben und unten. So werden kleine Veraenderungen deutlich sichtbar.

### Aenderungen

#### 1. `src/lib/bodyscan/analytics.ts`
Neue Hilfsfunktion `computeTightDomain(values: number[], padding = 0.1)`:
- Berechnet `min` und `max` aus den Daten
- Fuegt oben/unten einen Puffer hinzu (z.B. 10% der Spanne, mindestens 1 Einheit)
- Rundet auf schoene Werte (z.B. `Math.floor(min)` / `Math.ceil(max)`)

#### 2. `src/components/bodyscan/CompositionTrendChart.tsx`
- Aus `data` die Min/Max-Werte fuer alle drei Serien (Gewicht, Muskelmasse, Fettmasse) berechnen
- `<YAxis domain={[computedMin, computedMax]} />` setzen
- `tickCount={6}` fuer feinere Achsen-Unterteilung

#### 3. `src/components/bodyscan/FatMuscleAreaChart.tsx`
- Separate Domains fuer linke Y-Achse (Koerperfett %) und rechte Y-Achse (Muskelmasse kg) berechnen
- `<YAxis yAxisId="left" domain={[fatMin, fatMax]} />` und `<YAxis yAxisId="right" domain={[muscleMin, muscleMax]} />`
- `tickCount={6}` auf beiden Achsen

### Ergebnis
Kurven zeigen deutlich sichtbare Steigungen/Gefaelle bei kleinen Veraenderungen. Die Achsen passen sich automatisch an den jeweiligen Datenbereich an.

