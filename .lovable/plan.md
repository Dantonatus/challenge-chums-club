

## Alle 3 Body-Scan-Charts: Aenderungen besser sichtbar machen

### Kernproblem
Die Charts sind zu klein und/oder die Y-Achsen nutzen den verfuegbaren Platz nicht optimal. Kleine aber wichtige Aenderungen (0.5-2 kg, 0.5% Fett) gehen visuell unter.

### Loesung: 3 Massnahmen

#### 1. CompositionTrendChart — Groessere Charts + aggressiveres Tight Domain
- Oberer Chart (Gewicht + Muskelmasse): Hoehe von 200px auf **280px** erhoehen
- Unterer Chart (Fettmasse): Hoehe von 140px auf **200px** erhoehen
- `computeTightDomain` Padding von 0.3 auf **0.15** reduzieren — so wird der verfuegbare Platz besser ausgenutzt und Kurven erscheinen steiler
- **Dickere Linien** (strokeWidth 2 → 2.5) und **groessere Dots** (r: 3 → 4) fuer bessere Lesbarkeit
- Jeder Datenpunkt zeigt den **Delta-Wert zum Vorgaenger** als kleines farbiges Label direkt an der Kurve (z.B. "+0.3" oder "-0.8"), damit man Aenderungen sofort liest ohne Tooltip

#### 2. FatMuscleAreaChart — Groesser + engere Domains
- Hoehe von 340px auf **400px** erhoehen
- Padding fuer beide `computeTightDomain` Aufrufe auf **0.15** reduzieren
- Dickere Linien (strokeWidth 2 → 2.5)
- Area-Fill Opacity leicht erhoehen (0.15 → 0.2) fuer bessere Flaechenwirkung

#### 3. Segment-Charts (SegmentMuscleChart + SegmentFatChart) — Tight Y-Achse + Differenz-Anzeige
- **Tight Domain** auf die Y-Achse anwenden (aktuell fehlt das — Y startet bei 0, was bei Werten wie 25-30 kg die Balken-Unterschiede unsichtbar macht)
- `computeTightDomain` mit Padding 0.2 verwenden, sodass z.B. die Achse von 24-31 statt 0-31 geht
- Hoehe von 340px auf **380px** erhoehen
- **Delta-Label** auf jedem "Aktuell"-Balken: zeigt die Differenz zum "Vorher"-Wert als Badge (z.B. "+0.4 kg" gruen, "-0.2 kg" rot)

### Dateien

| Datei | Aenderung |
|---|---|
| `CompositionTrendChart.tsx` | Hoehe erhoehen, Padding reduzieren, dickere Linien/Dots, Delta-Labels an Datenpunkten |
| `FatMuscleAreaChart.tsx` | Hoehe erhoehen, Padding reduzieren, dickere Linien, Area-Fill staerker |
| `SegmentMuscleChart.tsx` | Tight domain auf Y-Achse, Hoehe erhoehen, Delta-Labels auf Balken |
| `SegmentFatChart.tsx` | Tight domain auf Y-Achse, Hoehe erhoehen, Delta-Labels auf Balken |

### Ergebnis
- Alle Charts nutzen den vertikalen Platz maximal aus
- Kleine Aenderungen erzeugen deutlich sichtbare Kurven-/Balken-Bewegungen
- Delta-Werte direkt am Datenpunkt machen Trends sofort lesbar ohne Hovern

