

# Fix: Heute-Linie zeigt falsches Datum an

## Problem

Die rote "Heute"-Linie in der Quartals- und Halbjahresansicht ist nach rechts verschoben, weil die Positionsberechnung fehlerhaft ist. Der Prozentsatz wird auf die **gesamte Container-Breite** angewendet (inkl. der 180px/160px Kunden-Spalte), statt nur auf den **Kalenderbereich** rechts davon.

Beispiel bei Q1 2026 (21. Feb):
- Korrekt: Linie bei ~73% des Februar-Bereichs
- Aktuell: Linie ist um ca. 180px * leftPercent/100 nach rechts verschoben, landet dadurch im Maerz

## Loesung

Die `calc()`-Formel in beiden `TodayLine`-Komponenten korrigieren:

**Vorher** (falsch):
```
left: calc(180px + leftPercent%)
```

**Nachher** (korrekt):
```
left: calc(180px + (100% - 180px) * leftPercent / 100)
```

So wird der Prozentsatz nur auf den verfuegbaren Kalenderbereich angewendet.

## Betroffene Dateien

1. **`src/components/planning/QuarterCalendar.tsx`** (Zeile 179): Style-Aenderung in der `TodayLine`-Komponente
2. **`src/components/planning/HalfYearCalendar.tsx`** (Zeile 181): Gleiche Style-Aenderung mit 160px statt 180px

Keine weiteren Aenderungen noetig.
