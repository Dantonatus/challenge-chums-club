

# Info-Icons mit Erklaerungen fuer alle Trend-Buttons

## Was wird geaendert

Aktuell hat nur der **Prognose 14d** Button ein Info-Icon mit Popover-Erklaerung. Alle anderen Buttons (7 Tage, 30 Tage, Lineare Regression, Prognose 30d, Alte Prognosen) bekommen dasselbe Pattern: ein kleines Info-Icon das bei Klick eine verstaendliche Erklaerung anzeigt.

## Erklaerungstexte

| Button | Erklaerung |
|---|---|
| **Oe 7 Tage** | Gleitender Durchschnitt der letzten 7 Tage. Glaettet Tagesschwankungen und zeigt den kurzfristigen Trend. Ideal um zu sehen ob sich in der aktuellen Woche etwas bewegt. |
| **Oe 30 Tage** | Gleitender Durchschnitt der letzten 30 Tage. Filtert Wasser- und Verdauungsschwankungen fast komplett raus. Zeigt den echten mittelfristigen Trend. |
| **Lineare Regression** | Berechnet eine gerade "Best-Fit"-Linie durch alle Datenpunkte. Zeigt die durchschnittliche Richtung ueber den gesamten Zeitraum -- steigt die Linie, nimmst du insgesamt zu, faellt sie, nimmst du ab. |
| **Prognose 14d** | (bleibt wie bisher mit Holt-Winters Erklaerung) |
| **Prognose 30d** | Gleiche Methode wie die 14-Tage-Prognose, aber auf 30 Tage in die Zukunft. Die Unsicherheit waechst mit der Zeit, daher ist das Konfidenzband breiter. |
| **Alte Prognosen** | Zeigt fruehere gespeicherte Prognosen als Overlay-Linien. So kannst du vergleichen wie genau deine Vorhersagen waren vs. was tatsaechlich passiert ist. |

## Technische Umsetzung

**Datei: `src/components/weight/WeightTerrainChart.tsx`**

1. Die `TREND_CONFIG` Map um ein `description`-Feld erweitern (Titel + Beschreibungstext)
2. Im Badge-Render-Loop: fuer **jeden** Button das gleiche Info-Popover-Pattern einbauen (nicht nur fuer forecast14)
3. Das bestehende `isForecast14`-Sonderbehandlung entfernen und stattdessen generisch aus der Config lesen
4. Den "Alte Prognosen"-Button ebenfalls mit einem Info-Popover versehen

Nur eine einzige Datei wird geaendert.

