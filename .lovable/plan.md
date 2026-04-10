

## Körperkomposition-Chart: Zurück zu kg mit logischer Achsenverteilung

### Konzept
Statt prozentualer Veränderung zeigt der Chart wieder absolute kg-Werte. Um trotzdem logisch korrekt zu bleiben und keine Misskonzeption zu erzeugen, werden die drei Serien auf **zwei farbcodierte Achsen** aufgeteilt — nach **ähnlichem Wertebereich gruppiert**:

- **Linke Achse (primär)**: Gewicht + Muskelmasse — beide im Bereich ~70-96 kg, tight domain
- **Rechte Achse (rot)**: Fettmasse — im Bereich ~15-20 kg, eigene tight domain

Das ist logisch korrekt, weil:
- Gewicht und Muskelmasse teilen denselben Massstab und sind direkt vergleichbar (man sieht z.B. "Muskel steigt, Gewicht bleibt gleich")
- Fettmasse hat einen klar getrennten, farblich markierten eigenen Massstab
- Keine Kreuzungen zwischen Serien auf verschiedenen Achsen, da Fettmasse visuell separiert ist

### Aenderungen

| Datei | Aenderung |
|---|---|
| `src/components/bodyscan/CompositionTrendChart.tsx` | Zurueck auf `compositionChartData()` mit kg-Werten. Linke Achse fuer Gewicht + Muskelmasse (tight domain), rechte Achse fuer Fettmasse (tight domain, rot gefaerbt). Einfacher Tooltip mit kg-Werten. Untertitel und ReferenceLine entfernen. |

Keine Aenderungen an `analytics.ts` noetig — `compositionChartData()` existiert bereits.

