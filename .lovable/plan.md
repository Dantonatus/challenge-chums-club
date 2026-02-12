
# Zwei Verbesserungen: Horizontales Drag & Drop + Rich-Text-Editor

## 1. Balken horizontal verschieben (Datum aendern)

Aktuell ist nur vertikales Sortieren moeglich (Reihenfolge aendern). Das horizontale Verschieben der Balken zum Aendern von Start-/Enddatum fehlt.

### Ansatz

Da `useSortable` bereits fuer vertikales Reordering verwendet wird, kann man nicht gleichzeitig dasselbe DnD-System fuer horizontales Verschieben nutzen. Stattdessen wird eine **native Pointer-Event-basierte Loesung** fuer das horizontale Ziehen des Balkens verwendet:

- Der Balken selbst bekommt `onPointerDown` / `onPointerMove` / `onPointerUp` Handler
- Waehrend des Ziehens wird ein lokaler `deltaX`-Offset im State gespeichert und per `transform: translateX()` visuell dargestellt
- Nach dem Loslassen wird `deltaX` ueber `pixelsToDays()` in Tage umgerechnet und `shiftDates()` berechnet die neuen Daten
- Callback `onTaskDragEnd(taskId, newStartDate, newEndDate)` wird aufgerufen

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `GanttTaskRow.tsx` | `onPointerDown`/`Move`/`Up` auf den Balken, lokaler `deltaX`-State, visuelles Feedback |
| `GanttChart.tsx` | Neue Prop `onTaskDragEnd`, Weiterleitung an Rows, Berechnung der Timeline-Breite |
| `GanttPage.tsx` | `handleTaskDrag`-Handler der `updateTask.mutate()` mit neuen Daten aufruft |

---

## 2. Groesseres Edit-Sheet mit Rich-Text-Editor

Das aktuelle Sheet ist `sm:max-w-lg` (ca. 512px) und nutzt ein einfaches `<Textarea>` fuer die Beschreibung.

### Aenderungen am Sheet

- Breite von `sm:max-w-lg` auf `sm:max-w-2xl` erhoehen (672px)
- Textarea von 3 auf 8 Zeilen erhoehen

### Rich-Text-Editor

Da keine externe Rich-Text-Bibliothek installiert ist und die Anforderungen ueberschaubar sind (fett, kursiv, unterstrichen, Listen), wird ein **Custom Toolbar + ContentEditable**-Ansatz verwendet:

- Neue Komponente `RichTextEditor.tsx` mit einer Toolbar-Leiste (Bold, Italic, Underline, Aufzaehlung, nummerierte Liste)
- Basiert auf `contentEditable` div mit `document.execCommand` fuer Formatierung
- Speichert den Inhalt als HTML-String in der bestehenden `description`-Spalte (text-Feld, kompatibel)
- Beim Laden wird vorhandener Plaintext weiterhin korrekt angezeigt
- Ersetzt das bisherige `<Textarea>` im GanttTaskSheet

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/planning/gantt/RichTextEditor.tsx` | Neue Komponente: Toolbar + contentEditable |
| `src/components/planning/gantt/GanttTaskSheet.tsx` | Breiteres Sheet, RichTextEditor statt Textarea |
| `src/components/planning/gantt/GanttPhaseDescriptions.tsx` | HTML-Beschreibungen rendern statt Plaintext |

---

## Technische Details

### Horizontales Drag & Drop (Pointer Events)

```text
+------------------+--------------------------------------------+
| Phase-Label      | [====Balken====]                           |
| (Drag-Handle     |  ^                                         |
|  fuer vertikal)  |  Pointer-Drag fuer horizontal              |
+------------------+--------------------------------------------+
```

- `onPointerDown` auf dem Balken: Startet Tracking, speichert `startX`
- `onPointerMove` (auf `document`): Berechnet `deltaX = currentX - startX`, setzt `transform: translateX(deltaX)`
- `onPointerUp`: Berechnet Tage-Delta, ruft Callback auf, setzt `deltaX` zurueck
- `e.stopPropagation()` verhindert, dass der Klick den Task-Edit-Dialog oeffnet
- Cursor wechselt zu `ew-resize` auf dem Balken

### Rich-Text-Editor

- Toolbar-Buttons: **B**, *I*, U, Aufzaehlung, Nummerierung
- `document.execCommand('bold')`, `execCommand('italic')`, etc.
- `onInput`-Handler liest `innerHTML` und gibt es an den Parent zurueck
- `dangerouslySetInnerHTML` fuer initiales Rendering
- Minimales Styling: Border, Padding, min-height 200px
- In `GanttPhaseDescriptions` wird `dangerouslySetInnerHTML` verwendet um HTML zu rendern (da es nur eigene Inhalte sind, ist das sicher)

### Keine Datenbank-Aenderungen noetig

Die `description`-Spalte in `gantt_tasks` ist bereits `text` und kann sowohl Plain-Text als auch HTML speichern.
