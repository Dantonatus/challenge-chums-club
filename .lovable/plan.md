

# Gewichtsprognose -- EWMA + Trend mit futuristischer Darstellung

## Modell

Holt-Winters Double Exponential Smoothing ohne Saisonalitaet:
- Level: S_t = alpha * y_t + (1 - alpha) * (S_{t-1} + T_{t-1})
- Trend: T_t = beta * (S_t - S_{t-1}) + (1 - beta) * T_{t-1}
- Forecast: F_{t+k} = S_t + k * T_t
- Konfidenzband: +/- 1.96 * sigma * sqrt(k)

Alpha = 0.3, Beta = 0.2. Refinement passiert automatisch: jeder neue Eintrag triggert React Query Invalidation, useMemo berechnet Forecast neu.

## Futuristische visuelle Trennung

Die Prognose-Zone wird klar vom realen Bereich abgegrenzt:

1. **Vertikale Trennlinie** am letzten realen Datenpunkt -- gestrichelte weisse/helle ReferenceLine mit Label "Heute"
2. **Hintergrund-Split**: Der Prognose-Bereich bekommt einen eigenen subtilen Hintergrund-Gradient (violett/dunkel) via ReferenceArea
3. **Prognose-Linie**: Leuchtend violette gestrichelte Linie mit Glow-Effekt (doppelte Line -- eine breitere mit niedriger Opacity als "Glow", eine duenne scharfe darueber)
4. **Konfidenzband**: Halbtransparente violette Area die sich nach rechts auffaechert -- zeigt wachsende Unsicherheit
5. **Pulsierender Endpunkt**: Der letzte Prognose-Punkt bekommt einen animierten pulsierenden Dot (CSS Animation)
6. **Label**: Kleines "PROGNOSE" Label im Prognose-Bereich

## Technische Umsetzung

### 1. `src/lib/weight/analytics.ts` -- Neue `forecast()` Funktion

```text
export function forecast(
  entries: WeightEntry[],
  days = 30,
  alpha = 0.3,
  beta = 0.2
): { date: string; value: number; lower: number; upper: number }[]
```

- Sortiert Eintraege chronologisch
- Berechnet Level und Trend iterativ ueber alle Datenpunkte
- Berechnet Residuen-Standardabweichung (sigma)
- Generiert 30 zukuenftige Datenpunkte mit Konfidenzband
- Konfidenz waechst mit sqrt(k) -- Tag 1 ist eng, Tag 30 ist breit

### 2. `src/components/weight/WeightTerrainChart.tsx` -- Erweiterungen

**Neuer TrendKey**: `'forecast'` mit Farbe `hsl(270, 70%, 55%)` (leuchtendes Violett)

**Chart-Daten erweitern**:
- Reale Punkte: `weight` gefuellt, `forecast`/`forecastLower`/`forecastUpper` = null
- Prognose-Punkte: `weight` = null, `forecast`/`forecastLower`/`forecastUpper` gefuellt
- Letzter realer Punkt bekommt auch forecast-Wert (nahtloser Uebergang)

**Neue Recharts-Elemente**:
- `<ReferenceArea>` fuer den Prognose-Hintergrund (violetter Tint)
- `<ReferenceLine>` vertikal am letzten realen Datum mit "Heute"-Label
- `<Area>` fuer Konfidenzband (`forecastUpper` bis `forecastLower`)
- `<Line>` breit + transparent fuer Glow-Effekt
- `<Line>` duenn + scharf fuer die eigentliche Prognose-Linie
- Beide gestrichelt

**Toggle-Chip**: "Prognose 30d" als vierter Chip neben den bestehenden drei, standardmaessig aktiv

**Tooltip erweitert**: Bei Prognose-Punkten zeigt es "Prognose: X kg" und "Bereich: Y - Z kg"

**CSS/Glow**: SVG-Filter `<feGaussianBlur>` im `<defs>` Block fuer den Leuchteffekt der Prognose-Linie

**Y-Achse**: Domain erweitert sich automatisch auf Konfidenzband-Extremwerte

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/weight/analytics.ts` | Neue `forecast()` Funktion mit Holt-Winters EWMA |
| `src/components/weight/WeightTerrainChart.tsx` | Neuer "Prognose 30d" Toggle, Glow-Linie, Konfidenzband, ReferenceArea, ReferenceLine, erweitertes Tooltip |

