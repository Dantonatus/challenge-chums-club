

# Drag & Drop fuer Gantt-Aufgaben (Phasen verschieben)

## Uebersicht

Die Balken im Gantt-Chart werden per Drag & Drop horizontal verschiebbar. Beim Ziehen verschiebt sich die gesamte Phase (Start- und Enddatum bleiben relativ gleich, nur der Zeitpunkt aendert sich). Nach dem Loslassen wird das neue Datum in die Datenbank geschrieben.

---

## Funktionsweise

- Der Benutzer zieht einen Aufgabenbalken horizontal im Zeitstrahl
- Waehrend des Ziehens wird der Balken visuell an der neuen Position dargestellt
- Start- und Enddatum werden um die gleiche Anzahl Tage verschoben (Dauer bleibt gleich)
- Nach dem Loslassen wird die Aenderung gespeichert

---

## Technische Umsetzung

Das Projekt verwendet bereits `@dnd-kit/core`. Folgende Dateien werden geaendert:

### 1. GanttChart.tsx - DndContext hinzufuegen

- `DndContext` aus `@dnd-kit/core` wrappen um den Task-Bereich
- `onDragEnd`-Handler: Berechnet aus dem horizontalen Delta (in Pixeln) die Anzahl verschobener Tage und ruft `updateTask` auf
- Neue Prop `onTaskDragEnd` fuer die Datums-Aktualisierung
- Hilfsfunktion: Pixel-Delta zu Tage-Delta umrechnen basierend auf der Gesamtbreite und dem Datumsbereich

### 2. GanttTaskRow.tsx - Balken draggable machen

- `useDraggable` aus `@dnd-kit/core` auf den Aufgabenbalken anwenden
- Nur horizontale Bewegung (`transform` nur X-Achse)
- Cursor aendert sich zu `grab` / `grabbing`
- Waehrend des Ziehens: Balken folgt der Maus horizontal, Tooltip zeigt die neuen Daten an

### 3. GanttPage.tsx - Update-Logik verbinden

- Neuer Handler `handleTaskDrag` der `updateTask.mutate()` mit den neuen Start/End-Daten aufruft
- Wird als Prop an `GanttChart` weitergegeben

### 4. ganttUtils.ts - Neue Hilfsfunktion

- `pixelsToDays(deltaX, totalWidth, weeks)`: Rechnet horizontalen Pixel-Offset in Tage um
- `shiftDates(startDate, endDate, days)`: Verschiebt beide Daten um n Tage

---

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/planning/gantt/GanttChart.tsx` | DndContext wrapper, onDragEnd-Handler |
| `src/components/planning/gantt/GanttTaskRow.tsx` | useDraggable auf Balken, visuelles Feedback |
| `src/components/planning/gantt/GanttPage.tsx` | handleTaskDrag Handler mit updateTask |
| `src/lib/planning/ganttUtils.ts` | pixelsToDays + shiftDates Hilfsfunktionen |

Keine Datenbank-Aenderungen noetig - die bestehende `updateTask`-Mutation wird wiederverwendet.

