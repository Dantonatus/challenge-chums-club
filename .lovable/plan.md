

## Mehrere Projekte pro Kunde in der Horizon-Ansicht

### Ist-Zustand

Aktuell zeigt die Horizon-Ansicht (`QuarterCalendar`/`HalfYearCalendar`) pro Kunde **einen einzigen Balken**, der aus `client.start_date`/`client.end_date` berechnet wird. Die `planning_projects`-Tabelle existiert bereits (mit `client_id`, `start_date`, `end_date`, `name`, `color`), wird aber nur im Gantt-Tab genutzt.

### Loesung

Die `ClientPeriodBar` wird erweitert, um statt eines einzelnen Client-Balkens **mehrere Projekt-Balken** nebeneinander darzustellen. Jedes `planning_project` eines Kunden wird als separates Segment in der Zeile gerendert.

### Aenderungen

**1. Daten laden: `PlanningPage.tsx`**
- `usePlanningProjects()` (ohne clientId-Filter) aufrufen, um alle Projekte des Users zu laden.
- Die Projekte nach `client_id` gruppiert an `QuarterCalendar`/`HalfYearCalendar` weitergeben (neues Prop `projectsByClient`).

**2. Durchreichen: `QuarterCalendar.tsx` + `HalfYearCalendar.tsx`**
- Neues Prop `projectsByClient: Record<string, PlanningProject[]>` akzeptieren.
- An `ClientPeriodBar` die Projekte des jeweiligen Kunden als `projects` Prop weiterreichen.

**3. Kernlogik: `ClientPeriodBar.tsx`**
- Neues Prop `projects?: PlanningProject[]`.
- Statt eines einzelnen Balkens aus `client.start_date`/`client.end_date` werden **mehrere Balken** gerendert -- einer pro Projekt.
- Jeder Projektbalken bekommt:
  - Position/Breite aus `project.start_date`/`project.end_date` (analog zur bestehenden Berechnung).
  - Farbe: `project.color || client.color` (mit leicht variierter Opacity fuer visuelle Unterscheidung).
  - Tooltip mit Projektname und Zeitraum.
  - Meilensteine werden dem Projekt zugeordnet, dessen Zeitraum sie ueberlappt (Fallback: naechstes Projekt).
- Falls keine Projekte vorhanden, Fallback auf das bisherige Verhalten (`client.start_date`/`client.end_date`).

**4. Projekt-Label im Balken**
- Jeder Projektbalken zeigt bei genuegend Breite den Projektnamen als zentrierten Text an (truncated).
- Bei Klick auf den Balken oeffnet sich der `ClientEditSheet` (bestehendes Verhalten bleibt).

**5. Client-Zeitraum automatisch ableiten**
- Der sichtbare "Gesamtbalken" ergibt sich aus der Vereinigung aller Projektbalken. Die `client.start_date`/`client.end_date`-Felder werden nicht mehr als primaere Quelle fuer die Darstellung genutzt, nur noch als Fallback wenn keine Projekte existieren.

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `PlanningPage.tsx` | Projekte laden, gruppiert weitergeben |
| `QuarterCalendar.tsx` | Neues Prop akzeptieren, an ClientPeriodBar reichen |
| `HalfYearCalendar.tsx` | Analog zu QuarterCalendar |
| `ClientPeriodBar.tsx` | Mehrere Projektbalken statt einem Kundenbalken rendern |
| `MonthView.tsx` | Projekte in Mobilansicht anzeigen (optional, Folgeschritt) |

Keine Datenbank-Aenderungen noetig -- `planning_projects` existiert bereits mit allen benoetigten Feldern.

