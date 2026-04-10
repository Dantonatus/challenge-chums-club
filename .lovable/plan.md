

## Körperkomposition: Eine gemeinsame Y-Achse für korrekte visuelle Ordnung

### Problem
Durch die zwei getrennten Y-Achsen (links: Gewicht/Muskel ~70-95 kg, rechts: Fett ~15-20 kg) kann die Fettmasse-Linie visuell auf gleicher Höhe wie Gewicht oder Muskelmasse erscheinen. Das ist irreführend — logisch muss immer gelten: Fettmasse < Muskelmasse < Gewicht.

### Lösung
**Eine einzige Y-Achse** für alle drei Serien. Die rechte Achse wird entfernt. Damit bleibt die natürliche Ordnung (Fett unten, Muskel Mitte, Gewicht oben) immer erhalten.

Um trotzdem Veränderungen sichtbar zu machen:
- `computeTightDomain` über alle drei Serien hinweg mit etwas Padding
- Das ergibt z.B. eine Achse von ~15 bis ~98 kg — die Abstände zwischen den Linien zeigen die echten Proportionen
- `tickCount={8}` für feinere Unterteilung

### Datei
`src/components/bodyscan/CompositionTrendChart.tsx`:
- Rechte YAxis entfernen
- Eine gemeinsame YAxis mit Domain über alle Werte (Gewicht, Muskelmasse, Fettmasse)
- Alle drei `<Line>` auf dieselbe `yAxisId`
- Achsen-Label: "kg"

