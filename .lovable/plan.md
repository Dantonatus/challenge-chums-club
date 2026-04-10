

## Körperkomposition-Chart: Separate Y-Achsen pro Serie

### Problem
Alle drei Serien (Gewicht ~95kg, Muskelmasse ~73kg, Fettmasse ~18kg) teilen sich eine Y-Achse. Der Bereich ~17-96 ist so gross, dass Aenderungen von 1-2 kg unsichtbar sind.

### Loesung
Drei separate tight domains berechnen und jeder Serie eine eigene `yAxisId` zuweisen. Recharts unterstuetzt nur links/rechts, daher:
- **Linke Achse**: Gewicht (sichtbar, mit Beschriftung)
- **Rechte Achse**: Muskelmasse (sichtbar, mit Beschriftung)  
- **Dritte Achse**: Fettmasse (versteckt, `hide={true}`) — die Werte erscheinen trotzdem korrekt skaliert ueber Labels/Tooltip

So hat jede Kurve ihren eigenen Massstab und kleine Veraenderungen werden deutlich sichtbar.

### Datei
`src/components/bodyscan/CompositionTrendChart.tsx`:
- Drei separate `computeTightDomain`-Aufrufe fuer Gewicht, Muskelmasse, Fettmasse
- Drei `<YAxis>` mit je eigener `yAxisId` und eigenem `domain`
- Jede `<Line>` bekommt die passende `yAxisId`
- `tickCount={6}` auf allen sichtbaren Achsen

