# Redesign: RoutineMap → großzügiger Bubble-Chart

## Problem

Der aktuelle „Routine Map"-Block auf `/app/training` zeigt ein enges Grid aus kleinen Quadraten mit Zahlen. Die Häufigkeit lässt sich nur lesen, nicht sehen. Zellen sind zu klein (≈24 px), die Zahl im Inneren erschlägt die Farbkodierung, und der Block wirkt neben der „Recovery Rhythm"-Karte gequetscht.

## Zielbild

Ein voll­flächiger Bubble-Chart, der auf einen Blick zeigt: „wann trainierst du typischerweise?". Größe = Häufigkeit. Farbe = Intensität. Keine Zahlen in den Bubbles. Groß, luftig, mit klarer Achsenführung.

## Layout-Änderung (`TrainingPage.tsx`)

- Zweispalten-Grid (`lg:grid-cols-[1.4fr_1fr]`) auflösen.
- RoutineMap bekommt eine **eigene, volle Breite** direkt unter dem `ConsistencyHero`.
- `RecoveryRhythm` rückt darunter (volle Breite oder in einer eigenen Zeile).

## Neu: `RoutineMap` als Bubble-Matrix

**Struktur**
- Große `ChartFrame`-Karte, innen ein SVG (responsiv, `viewBox`, `preserveAspectRatio="xMidYMid meet"`), Zielhöhe ~460–520 px auf Desktop, ~360 px auf Mobile.
- Y-Achse: 7 Wochentage (Mo–So), Zeilenhöhe großzügig (~56 px).
- X-Achse: dynamisch beschnittener Stundenbereich (wie heute `trainingHourDomain`), Ticks alle 1–2 h abhängig von Spanne, Beschriftung unterhalb.
- Sanfte horizontale Zebra-Streifen (`health-hairline / 30 %`) für Wochentage, dezente vertikale Rasterlinien pro Stunde.

**Bubbles**
- Ein Kreis pro (Wochentag × Stunde) mit `count > 0`.
- **Radius = Fläche ∝ count** (Fläche, nicht Radius, linear zur Anzahl): `r = rMin + (rMax − rMin) · sqrt(count / maxCount)`; `rMin ≈ 6`, `rMax` = 45 % der Zeilenhöhe. Sqrt sorgt für wahrnehmungs­korrekte Flächen­skalierung.
- Farbe: `hsl(var(--health-observed))` mit Alpha `0.35 + 0.55 · (count/maxCount)`; feiner Ring `stroke health-observed / 0.9`, `stroke-width 1.25`.
- **Keine Zahl im Kreis.** Hover/Focus zeigt Tooltip: „Di · 18:00 – 19:00 · 4 Check-ins".
- Aktive Bubble (Hover/Focus): weicher Glow (`filter: drop-shadow`), Bubble skaliert +8 %.

**Verlässlichstes Fenster**
- Als dezenter horizontaler Balken im Hintergrund der betreffenden Zeile (Halbtransparent, `health-observed / 0.08`), von `hourStart` bis `hourEnd`.
- Kurzer Label-Chip rechts über der Chart-Fläche: „Verlässlichstes Fenster: Di 17:30–19:00".
- Die separate rechte Sidebar entfällt (Info wandert in den Chart-Header/Chip). Frei­gewordene Fläche geht an den Chart.

**Legende**
- Unter dem Chart, zentriert: 3–4 aufsteigende Referenz-Bubbles mit Zahl daneben („1 · 3 · 5 · max"), damit Größe → Anzahl kalibrierbar bleibt.
- Standort-Filter (Dropdown) bleibt im Header-Action-Slot.

**A11y / States**
- Jede Bubble: `<circle role="img" tabIndex={0} aria-label="Dienstag 18:00 Uhr, 4 Check-ins">`.
- Empty state: „Noch keine Trainings im gewählten Zeitraum."
- Reine 1-Zelle: Chart rendert trotzdem, Legende zeigt nur „1".

## Nicht angefasst

- `analytics.ts` (`routineHeatmap`, `trainingHourDomain`, `preferredTrainingWindow`) – Datenlogik bleibt identisch.
- Andere Module (ConsistencyHero, RecoveryRhythm, Brief, Accordion).
- PDF-Report (`buildTrainingReportModel`) – rein visuelle Änderung.

## Technische Details

- SVG statt CSS-Grid → präzise Positionierung, sauberes Scaling, exportfähig.
- Ein `ResizeObserver` (oder `useMeasure`-Hook via `useRef` + `useLayoutEffect`) misst Container-Breite → berechnet `xScale`. Höhe fix pro Zeile.
- Tooltip: leichtgewichtig via lokalem `hoveredCell`-State und absolut positioniertem Div über der SVG-Position (kein Recharts nötig).

## Akzeptanzkriterien

- RoutineMap nimmt die volle Content-Breite ein, mind. 420 px hoch auf Desktop.
- Kreisgrößen sind auf den ersten Blick unterscheidbar (Verhältnis max:min ≥ 4:1 sichtbar).
- Keine Zahl in den Bubbles; Zählwert nur in Tooltip + Legende.
- „Verlässlichstes Fenster" bleibt sofort auffindbar, ohne separate Seitenspalte.
- Keine Änderung an Datenberechnung, PDF-Export, anderen Modulen.
- `npm run build` grün, keine Console-Errors.
