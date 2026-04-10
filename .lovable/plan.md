

## Logische Achsenverteilung fuer Body Scan Charts

### Problem
Der Kompositions-Chart hat 3 Serien auf 3 unabhaengigen Y-Achsen mit je eigenem tight domain. Das fuehrt zu **visuellen Fehlinterpretationen**: Linien kreuzen sich oder laufen parallel, obwohl die tatsaechlichen Werte das nicht widerspiegeln. Ein Betrachter liest "Fettmasse steigt ueber Muskelmasse" — was bei 18kg vs 73kg natuerlich Unsinn ist.

### Loesung: Prozentuale Veraenderung vom Startwert

**Kompositions-Chart** — statt absolute kg-Werte auf getrennten Achsen:
- **Eine gemeinsame Y-Achse** in **% Veraenderung vom ersten Scan**
- Gewicht +2% = +1.9 kg, Muskelmasse -1% = -0.7 kg, Fettmasse -5% = -0.9 kg
- Alle drei Kurven starten bei 0% und sind **direkt vergleichbar**
- Kleine Veraenderungen werden sichtbar, ohne visuelle Fehlkonzepte
- Tooltip zeigt sowohl den %-Wert als auch den absoluten Wert in kg
- Achsen-Label: "Veraenderung in %"
- Chart-Untertitel: "Relativ zum ersten Scan (Datum)"

**Fett vs. Muskel Chart** — hier ist Dual-Axis OK, da:
- Nur 2 Serien mit klar unterschiedlichen Einheiten (% vs. kg)
- Achsen-Ticks und Labels **farblich** den Serien zuordnen (rot = Fett %, blau = Muskel kg)
- Das ist ein etabliertes Muster, keine Misskonzeption

### Aenderungen

| Datei | Aenderung |
|---|---|
| `src/lib/bodyscan/analytics.ts` | Neue Funktion `compositionChangeData()` — berechnet %-Veraenderung relativ zum ersten Scan fuer Gewicht, Muskelmasse, Fettmasse; gibt auch absolute Werte fuer Tooltip mit |
| `src/components/bodyscan/CompositionTrendChart.tsx` | Umstellen auf eine gemeinsame Y-Achse mit %-Veraenderung, Custom Tooltip mit absolutem + relativem Wert, Untertitel mit Referenzdatum |
| `src/components/bodyscan/FatMuscleAreaChart.tsx` | Achsen-Ticks und Labels farblich an Serien anpassen (rot links, blau rechts) |

### Ergebnis
- Komposition: Alle 3 Kurven auf einer Achse, direkt vergleichbar, keine Misskonzeption
- Fett vs. Muskel: Klare farbliche Zuordnung der Achsen zu den Serien

