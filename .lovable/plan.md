
# Oszillation im Info-Popover, datenbasierte Unsicherheit, 14d/30d Toggle

## 1. Info-Popover um Oszillations-Erklaerung erweitern

Der Popover-Text (Zeilen 190-199 in WeightTerrainChart.tsx) wird um einen Absatz zur Oszillationslinie ergaenzt:
- "Die duenne Linie zeigt einen simulierten realistischen Verlauf mit deinen typischen Tagesschwankungen (aktuell ca. X kg). Diese Schwankung wird aus deinen bisherigen Tag-zu-Tag-Differenzen berechnet."

Dafuer muss `dailySwing` aus der `forecast()`-Funktion heraus zugaenglich sein. Die Funktion wird erweitert, sodass sie neben dem Array auch die berechnete `dailySwing` zurueckgibt (als Objekt: `{ points, dailySwing }`).

## 2. Unsicherheitsband auf eigenen Daten basieren

**Aktuell**: Das Konfidenzband nutzt `cappedSigma` (Residual-Standardabweichung, gecappt auf 0.5 kg). Das ist modellbasiert, nicht direkt aus den Tagesschwankungen.

**Neu**: Das Band nutzt `dailySwing` (Standardabweichung der Tag-zu-Tag-Differenzen) als Basis -- das ist die **tatsaechliche Schwankung des Users**. Formel wird:
```text
margin = min(1.96 * dailySwing * sqrt(k), 2.0)
```
Der Cap wird auf 2.0 kg erhoeht (bei 30 Tagen braucht man etwas mehr Spielraum). So waechst die Unsicherheit mit der Zeit, aber basiert auf den echten Schwankungen.

## 3. 14d und 30d Prognose-Buttons

Statt eines einzelnen Forecast-Buttons gibt es zwei separate Buttons: **Prognose 14d** und **Prognose 30d**. Nur einer kann gleichzeitig aktiv sein.

### Technische Umsetzung

**TrendKey** wird erweitert: `'forecast'` wird ersetzt durch `'forecast14'` und `'forecast30'`.

Die State-Logik stellt sicher, dass beim Aktivieren von `forecast14` automatisch `forecast30` deaktiviert wird und umgekehrt.

Beide Forecasts werden mit `forecast(entries, 14)` bzw. `forecast(entries, 30)` berechnet. Die aktive Variante wird angezeigt.

Das Info-Icon mit Popover wird nur beim ersten Forecast-Button angezeigt (gilt fuer beide Varianten).

## Technische Aenderungen

### `src/lib/weight/analytics.ts`

- **Return-Typ** von `forecast()` aendern: gibt jetzt `{ points: [...], dailySwing: number }` zurueck statt nur das Array
- **Konfidenzband**: `cappedSigma` durch `dailySwing` ersetzen. `margin = min(1.96 * dailySwing * sqrt(k), 2.0)`
- Die Oszillation und der Trend bleiben unveraendert

### `src/components/weight/WeightTerrainChart.tsx`

- **TrendKey**: `'forecast'` ersetzen durch `'forecast14' | 'forecast30'`
- **TREND_CONFIG**: Zwei Eintraege statt einem: `forecast14: { label: 'Prognose 14d', ... }` und `forecast30: { label: 'Prognose 30d', ... }`
- **State-Logik**: `toggleTrend()` anpassen -- wenn `forecast14` aktiviert wird, `forecast30` deaktivieren und umgekehrt
- **Forecast-Berechnung**: Beide Varianten vorberechnen, nur die aktive nutzen
- **Info-Popover**: Text erweitern um Oszillations-Erklaerung mit dem berechneten `dailySwing`-Wert (z.B. "Deine typische Tagesschwankung: 0.4 kg")
- **showForecastVisuals**: Pruefen ob `forecast14` ODER `forecast30` aktiv ist
- **Default-State**: `new Set(['ma7', 'forecast14'])` statt `new Set(['ma7', 'forecast'])`

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/weight/analytics.ts` | Return-Typ erweitert, Konfidenzband auf dailySwing umgestellt |
| `src/components/weight/WeightTerrainChart.tsx` | Zwei Forecast-Buttons, exklusiver Toggle, Popover-Text mit Oszillation + dailySwing |
