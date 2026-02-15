

# Forecast-Oszillation + Info-Icon Alignment

## 1. Natuerliche Schwankungen in der Prognose

### Problem
Die aktuelle Prognoselinie ist glatt und monoton -- sie geht nur in eine Richtung. Echtes Gewicht schwankt aber taeglich um 0.3-0.8 kg (Wasser, Nahrung, Verdauung). Die Prognose wirkt dadurch unrealistisch.

### Loesung
Die Prognoselinie bleibt als **Mittelwert-Linie** (glatt, gestrichelt) bestehen -- das ist der statistische Trend. Zusaetzlich wird eine **simulierte Schwankungslinie** als zweite Forecast-Linie hinzugefuegt, die natuerliche Tagesschwankungen nachbildet.

Konkret:
- Aus den historischen Daten wird die **typische Tagesschwankung** berechnet (Standardabweichung der Tag-zu-Tag-Differenzen)
- Fuer jeden Forecast-Tag wird ein deterministischer Sinus-Rausch-Wert addiert (kein Zufall -- damit die Linie bei jedem Render gleich bleibt)
- Die Schwankung oszilliert um die Trendlinie mit realistischer Amplitude (typisch 0.3-0.6 kg)

Visuell:
- **Gestrichelte Linie** (wie bisher): Trend-Mittelwert
- **Neue duenne Linie**: Simulierter realistischer Verlauf mit Hoch und Runter
- Das Konfidenzband bleibt als Huelle um beide Linien

### Technische Umsetzung

**`src/lib/weight/analytics.ts`** -- `forecast()` Funktion erweitern:
- Tag-zu-Tag-Differenzen der historischen Daten berechnen: `dailyDiffs = ys[i] - ys[i-1]`
- Standardabweichung der Differenzen = typische Tagesschwankung (`dailySwing`)
- Fuer jeden Forecast-Tag k: `oscillation = dailySwing * sin(k * 1.3 + cos(k * 0.7))` (deterministisch, nicht random)
- Neues Feld `simulated` im Return-Objekt: `value + oscillation`

**`src/components/weight/WeightTerrainChart.tsx`**:
- Neues Datenfeld `forecastSimulated` in chartData
- Neue duenne Linie (solid, nicht gestrichelt) in gleicher Farbe aber leicht transparent fuer die simulierten Schwankungen

## 2. Info-Icon Alignment

### Problem
Der Info-Button hat `h-[26px]` hardcoded, was nicht zur dynamischen Badge-Hoehe passt. Die Badge hat `py-1` (8px padding) plus Texthoehe, was je nach Font-Rendering anders ausfaellt.

### Loesung
Statt separater Buttons mit unterschiedlichen Hoehen wird das Info-Icon **innerhalb des Badge** platziert, nach dem Label-Text. Ein Klick auf das Icon oeffnet den Popover, ein Klick auf den Rest des Badge toggelt die Trend-Linie.

Konkret:
- Badge bekommt das Info-Icon als letztes Element (mit `onClick.stopPropagation()` damit der Badge-Toggle nicht ausloest)
- Kein separater Button mehr noetig
- Automatisch gleiche Hoehe, kein Alignment-Problem

### Technische Umsetzung

**`src/components/weight/WeightTerrainChart.tsx`**:
- Den separaten Info-Button (Zeilen 179-207) entfernen
- Info-Icon in den Badge verschieben (nach `{cfg.label}`)
- `borderTopRightRadius: 0` und `borderBottomRightRadius: 0` entfernen
- PopoverTrigger wird das Info-Icon innerhalb des Badge

## Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/weight/analytics.ts` | `forecast()` gibt zusaetzlich `simulated` Wert zurueck mit deterministischer Oszillation |
| `src/components/weight/WeightTerrainChart.tsx` | Neue simulierte Forecast-Linie, Info-Icon ins Badge integriert |

