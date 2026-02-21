

# Scan-Bericht Navigator mit Pfeiltasten

## Konzept

Ein eleganter Navigator oben auf der Seite, mit dem du zwischen deinen Scan-Berichten blaettern kannst. Zwei Pfeile (links/rechts) plus Anzeige von Datum und Geraet des aktuell ausgewaehlten Scans.

```text
+------------------------------------------------------------------+
| Training   [Check-ins] [Body Scan] [Gewicht]    [#] [PDF] [CSV]  |
+------------------------------------------------------------------+
|         <  24.09.2022 -- InBody 770  (3 von 8)  >                |
+------------------------------------------------------------------+
| KPI Cards (basierend auf ausgewaehltem Scan)                      |
| Charts (weiterhin alle Scans fuer Trends)                         |
| Anatomie-Figur (ausgewaehlter Scan vs. vorheriger)                |
| ...                                                               |
+------------------------------------------------------------------+
```

## Verhalten

- **Standard**: Neuester Scan ist ausgewaehlt (letzter in der Liste)
- **Pfeil links**: Einen aelteren Scan anzeigen
- **Pfeil rechts**: Einen neueren Scan anzeigen
- **Betroffene Komponenten**: KPI Cards, AnatomyFigure, MetabolismCard, ScanTimeline zeigen den ausgewaehlten Scan
- **Trend-Charts** (CompositionTrendChart, FatMuscleAreaChart, SegmentMuscle/FatChart): Zeigen weiterhin **alle Scans** fuer den Gesamttrend, aber mit einer visuellen Markierung des ausgewaehlten Datums

## Technische Umsetzung

### 1. BodyScanPage.tsx -- State + Navigator

- Neuer State: `selectedIndex` (default: `scans.length - 1`)
- Neuer `selectedScan` = `scans[selectedIndex]`
- `previousOfSelected` = `scans[selectedIndex - 1]` (fuer Diff-Berechnung)
- Navigator-UI direkt unter der Header-Zeile: `ChevronLeft` Button, Datum + Geraet + "X von Y", `ChevronRight` Button
- Pfeile deaktiviert am jeweiligen Ende (erster/letzter Scan)

### 2. Props anpassen

Komponenten die aktuell `scans` bekommen und intern `latestScan()` aufrufen, erhalten zusaetzlich `selectedScan` und `previousScan`:
- **BodyScanKPICards**: Bekommt `selectedScan` statt intern `latestScan(scans)` zu nutzen
- **AnatomyFigure**: Bekommt `selectedScan` + `previousScan` statt intern zu berechnen
- **MetabolismCard**: Bekommt `selectedScan`
- **ScanTimeline**: Bekommt `selectedIndex` fuer Hervorhebung

Trend-Charts bleiben unveraendert -- sie zeigen immer alle Scans.

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/pages/app/training/BodyScanPage.tsx` | Neuer `selectedIndex` State, Navigator-UI mit Pfeilen unter dem Header, `selectedScan`/`previousScan` berechnen und an Kinder weitergeben |
| `src/components/bodyscan/BodyScanKPICards.tsx` | Neue optionale Prop `selectedScan` -- wenn gesetzt, diesen statt `latestScan()` verwenden |
| `src/components/bodyscan/AnatomyFigure.tsx` | Neue optionale Props `selectedScan` + `previousScan` -- wenn gesetzt, diese statt intern berechnete verwenden |
| `src/components/bodyscan/MetabolismCard.tsx` | Neue optionale Prop `selectedScan` |
| `src/components/bodyscan/ScanTimeline.tsx` | Neue optionale Prop `selectedIndex` fuer visuelle Hervorhebung |

