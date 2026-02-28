
Ziel: Die X-Achse im Gewichtsverlauf soll visuell ruhig, gleichverteilt und nicht überladen sein; die lineare Regression soll mathematisch und visuell eine echte Gerade sein.

1) Befund aus dem aktuellen Code
- In `WeightTerrainChart.tsx` ist die X-Achse bereits eine Zeitachse (`type="number"`, `scale="time"`), aber ohne gezielte Tick-Steuerung. Dadurch erzeugt Recharts je nach Datenlage zu viele/uneinheitliche Datumslabels.
- Die Regression wird in `src/lib/weight/analytics.ts` aktuell auf 1 Nachkommastelle gerundet (`Math.round(... * 10) / 10`). Diese Quantisierung erzeugt kleine Knicke statt perfekter Kollinearität.
- In `WeightTerrainChart.tsx` ist der Regression-Renderer zwar schon `type="linear"`, aber durch die gerundeten Y-Werte kann sie trotzdem „nicht ganz gerade“ wirken.

2) Umsetzungsschritte

A. X-Achse: gleichverteilte, adaptive Tick-Menge (nicht überladen)
Datei: `src/components/weight/WeightTerrainChart.tsx`

- Eine neue `useMemo`-Berechnung für die X-Achse ergänzen:
  - `minTs` und `maxTs` aus `chartData` bestimmen.
  - `spanDays = (maxTs - minTs) / 86_400_000`.
  - Ziel-Tickanzahl abhängig von Zeitraum wählen (z. B. Woche ~5, Monat ~6, Quartal ~7, Jahr ~8, All ~9).
  - Ticks als gleichverteilte Zeitstempel zwischen `minTs` und `maxTs` generieren (nicht datenpunktbasiert, sondern domain-basiert).
- XAxis auf diese Ticks umstellen:
  - `ticks={xTicks}`
  - `interval={0}` (damit genau die berechneten Ticks verwendet werden)
  - `minTickGap` setzen (z. B. 28–40), damit Beschriftungen nicht kollidieren.
- Tick-Format adaptiv nach Zeitraum:
  - kurze Spannen: `dd. MMM`
  - lange Spannen (z. B. > 1 Jahr): `MMM yy`
  So bleibt die Achse lesbar und gleichmäßig.

Ergebnis:
- Immer gleichverteilte Beschriftungen über die sichtbare Zeitspanne.
- Deutlich weniger visuelle Überladung.

B. Regression: mathematisch exakt gerade
Datei: `src/lib/weight/analytics.ts`

- In `linearRegression()` die Rundung der Regressionswerte entfernen:
  - Statt gerundetem `value` den exakten `slope * xs[i] + intercept` zurückgeben.
- Optional (für stabile Darstellung): auf 3–4 Nachkommastellen runden, aber nicht auf 1 Stelle.

Warum:
- Bei 1-Nachkommastellen-Rundung entstehen Treppeneffekte/Knicke.
- Exakte Werte sichern Kollinearität aller Regressionspunkte.

C. Regression-Rendering hart auf „gerade Linie“ fixieren
Datei: `src/components/weight/WeightTerrainChart.tsx`

- Regression-Linie bei `type="linear"` belassen (kein monotone/spline).
- Für die Regression die Animation deaktivieren (`isAnimationActive={false}`), damit keine Übergangsform den Eindruck einer Kurve erzeugt.

Ergebnis:
- Die sichtbare Regressionslinie ist in jeder Ansicht eine klare, echte Gerade.

3) Qualitätssicherung (E2E)
- Im Gewicht-Tab nacheinander `Woche`, `Monat`, `Quartal`, `Jahr`, `Alle` prüfen:
  - X-Achse: wenige, gleichverteilte Datumslabels ohne Überlappung.
  - Regression: in jeder Periode sichtbar linear ohne Ausbeulungen.
- Sonderfall prüfen: große Datenlücke (z. B. Dezember → Januar) muss auf der Zeitachse proportional breiter erscheinen.
- Optional visuelle Kontrolle im PDF-Export (falls der Chart exportiert wird), ob Tick-Dichte und Regression identisch bleiben.

4) Technische Hinweise
- Es sind keine Backend-/Datenbankänderungen nötig; die Korrektur ist rein Frontend + Analysefunktion.
- Bestehende Forecast-/Tooltip-Logik bleibt unverändert.
- Das Verhalten bleibt kompatibel mit Zeitfilter (Morgens/Abends/Alle) und Zeitraumfilter aus `PeriodNavigator`.
