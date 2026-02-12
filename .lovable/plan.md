
# Vertikales Drag & Drop: Phasen-Reihenfolge im Gantt-Chart aendern

## Uebersicht

Die Phasen (Aufgaben) im Gantt-Chart sollen per Drag & Drop vertikal verschoben werden koennen, um die Reihenfolge zu aendern. Aktuell wird bereits `@dnd-kit/core` fuer horizontales Verschieben verwendet -- das wird erweitert um vertikale Sortierung mit `@dnd-kit/sortable`.

## Funktionsweise

- Der Benutzer zieht eine Phase nach oben oder unten
- Die anderen Phasen ruecken smooth auf, um Platz zu machen (animierte Uebergaenge)
- Nach dem Loslassen wird die neue `sort_order` aller betroffenen Phasen in der Datenbank gespeichert
- Horizontales Verschieben (Datum aendern) bleibt weiterhin moeglich

## Technische Umsetzung

### Neue Abhaengigkeit

- `@dnd-kit/sortable` muss installiert werden (ergaenzt das bereits vorhandene `@dnd-kit/core`)

### 1. GanttChart.tsx -- Sortable Context

- `SortableContext` mit `verticalListSortingStrategy` um die Task-Rows wrappen
- `onDragEnd` erweitern: Wenn sich die vertikale Position aendert (`over.id !== active.id`), die Reihenfolge neu berechnen und speichern
- Neue Prop `onTaskReorder` fuer die Sortier-Aktualisierung
- `arrayMove` aus `@dnd-kit/sortable` nutzen um die lokale Reihenfolge zu berechnen

### 2. GanttTaskRow.tsx -- Sortable statt nur Draggable

- `useDraggable` durch `useSortable` aus `@dnd-kit/sortable` ersetzen
- `useSortable` bietet sowohl horizontales als auch vertikales Dragging
- Die gesamte Zeile bekommt die Sortable-Referenz (fuer vertikale Bewegung)
- Der Balken innerhalb der Zeile bleibt fuer horizontales Verschieben zustaendig
- Smooth Animationen ueber die `transition`-Property von `useSortable`

### 3. useGanttTasks.ts -- Reorder-Mutation

- Neue `reorderTasks`-Mutation hinzufuegen
- Nimmt ein Array von `{ id, sort_order }` entgegen
- Fuehrt mehrere Updates in einer Schleife aus (oder per RPC-Funktion)
- Optimistisches Update: Lokale Reihenfolge sofort aendern, bei Fehler zurueckrollen

### 4. GanttPage.tsx -- Handler verbinden

- Neuer `handleTaskReorder`-Handler der die `reorderTasks`-Mutation aufruft
- Wird als Prop an `GanttChart` weitergegeben

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/planning/gantt/GanttChart.tsx` | SortableContext, erweiterter onDragEnd |
| `src/components/planning/gantt/GanttTaskRow.tsx` | useSortable statt useDraggable, Animations-Styles |
| `src/hooks/useGanttTasks.ts` | reorderTasks-Mutation |
| `src/components/planning/gantt/GanttPage.tsx` | handleTaskReorder-Handler |

Keine Datenbank-Aenderungen noetig -- das `sort_order`-Feld existiert bereits auf `gantt_tasks`.
