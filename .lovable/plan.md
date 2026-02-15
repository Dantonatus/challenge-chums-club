

# Prognose-Fixes: Proportion, Realismus, Info-Button

## 3 Probleme, 3 Fixes

### 1. Proportion -- Forecast nimmt zu viel Platz ein

**Aktuell**: 30 Forecast-Tage bei ~53 realen Datenpunkten = 36% des Charts ist Prognose.

**Fix**: Forecast auf **14 Tage** reduzieren. Das ergibt ~20% Forecast-Anteil -- visuell ausgewogen und trotzdem aussagekraeftig.

### 2. Unrealistischer Trend + zu breites Unsicherheitsband

**Problem Trend**: Der aktuelle Holt-Winters extrapoliert den Trend linear in die Zukunft (`level + k * trend`). Bei den Daten steigt das Gewicht zuletzt steil (Jan 91 -> Feb 93), und das Modell projiziert diesen Anstieg unveraendert weiter -- unrealistisch.

**Fix Trend**: **Damped Trend** (Holt-Winters mit Daempfungsfaktor phi=0.85):
```text
Statt:   F_{t+k} = Level + k * Trend
Neu:     F_{t+k} = Level + (phi + phi^2 + ... + phi^k) * Trend
```
Der Daempfungsfaktor sorgt dafuer, dass der Trend sich mit der Zeit abschwaechen und die Prognose sich einem Plateau naehert -- so wie es bei Gewicht in der Realitaet passiert.

**Problem Band**: `1.96 * sigma * sqrt(k)` waechst unbegrenzt. Bei Tag 30 und sigma=0.8 waere das +-4.4kg -- voellig unrealistisch.

**Fix Band**: Physiologisch gecapptes Konfidenzband:
- Basis: Residual-Sigma wie bisher, aber gecappt auf max 0.5 kg (entspricht normaler Tagesschwankung)
- Wachstum: `margin = cappedSigma * sqrt(k)`, aber maximal **1.5 kg** (selbst in 14 Tagen realistisch)
- Reale Tagesschwankung liegt bei 0.5-1.0 kg, absolute Extreme bei 2 kg

### 3. Info-Icon am Prognose-Button

Neben dem "Prognose 30d"-Badge (wird zu "Prognose 14d") kommt ein kleines Info-Icon (Lucide `Info`). Bei Klick oeffnet sich ein Popover mit:
- Modellname: "Holt-Winters Exponential Smoothing"
- Kurze Erklaerung: "Gewichtet juengste Werte staerker. Der Trend wird gedaempft, damit die Prognose realistisch bleibt."
- Hinweis zum Konfidenzband: "Das Band zeigt die erwartete Schwankungsbreite basierend auf deinen bisherigen Tagesschwankungen."
- Hinweis zum Refinement: "Jeder neue Eintrag verfeinert die Prognose automatisch."

## Technische Aenderungen

### `src/lib/weight/analytics.ts`

**forecast() Funktion anpassen:**
- Parameter `days` Default von 30 auf **14** aendern
- Damped Trend einfuehren: `phi = 0.85`, Forecast-Formel wird `level + sumPhi * trend` wobei `sumPhi = phi + phi^2 + ... + phi^k`
- Sigma cappen: `cappedSigma = Math.min(sigma, 0.5)`
- Margin cappen: `Math.min(margin, 1.5)`

### `src/components/weight/WeightTerrainChart.tsx`

- TREND_CONFIG: Label von "Prognose 30d" auf "Prognose 14d" aendern
- Info-Icon + Popover beim Forecast-Badge hinzufuegen (Lucide `Info` Icon, Radix Popover)
- Popover-Inhalt mit Modellbeschreibung

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/weight/analytics.ts` | Damped Trend (phi=0.85), Sigma-Cap (0.5), Margin-Cap (1.5), days=14 |
| `src/components/weight/WeightTerrainChart.tsx` | Label-Update, Info-Icon mit Popover am Forecast-Badge |

