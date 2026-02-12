

# Neues Modul: Projektplanung (Gantt mit echtem Kalender)

## Konzept

Ein neuer Tab "Projektplanung" neben der bestehenden "Uebersicht". Fuer jeden Kunden wird ein individueller Gantt-Chart angezeigt, der an den **echten Kalender** gebunden ist: Spaltenkoepfe zeigen Monate, darunter die tatsaechlichen ISO-Kalenderwochen (KW 5, KW 6, KW 7...).

## Kalender-Header-Struktur

```text
|          Februar 2026           |           Maerz 2026            |
| KW 6  | KW 7  | KW 8  | KW 9  | KW 10 | KW 11 | KW 12 | KW 13 |
|-------|-------|-------|-------|-------|-------|-------|-------|
| Analyse & Datenkonsolidierung   [================]               |
| Design                          |       [==============]         |
| Umsetzung                       |       |       [===============]|
```

- **Zeile 1**: Monatsname (colspan ueber die zugehoerigen KWs)
- **Zeile 2**: Echte Kalenderwochen (KW 6, KW 7, ...) -- berechnet via ISO-8601
- **Zeilen darunter**: Aufgaben mit farbigen Balken + Meilenstein-Rauten

Die bestehende `buildIsoWeeksInRange()` aus `src/lib/date.ts` und `isoWeekOf()` werden wiederverwendet fuer 100% akkurate Kalenderwochen.

## Datenmodell

### Neue Tabelle: `gantt_tasks`

Aufgaben werden mit **echten Datumswerten** gespeichert (nicht relative Wochen), da der Chart an den Kalender gebunden ist.

| Spalte | Typ | Beschreibung |
|--------|-----|-------------|
| id | uuid (PK) | |
| user_id | uuid (FK auth.users) | Besitzer |
| project_id | uuid (FK planning_projects) | Zugehoeriges Projekt |
| title | text | Aufgabenname |
| description | text, nullable | Optionale Details |
| start_date | date | Echtes Startdatum (Kalendertag) |
| end_date | date | Echtes Enddatum (Kalendertag) |
| sort_order | integer | Reihenfolge im Gantt |
| color | text, nullable | Farb-Override |
| is_completed | boolean, default false | Status |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Warum echte Daten statt relative Wochen?** Weil der Chart an den Kalender gebunden ist. KW 7 ist immer KW 7 -- unabhaengig vom Projektstart. Echte Daten ermoeglichen praezise Positionierung auf der Kalender-Zeitachse.

### Bestehende Tabellen -- keine Aenderung noetig
- `planning_projects`: Hat `start_date`, `end_date`, `client_id` -- definiert den sichtbaren Zeitraum
- `milestones`: Hat `project_id` (FK) -- wird als Rauten-Marker auf dem Chart angezeigt

## Architektur

```text
Route: /app/planning
  |
  +-- Tabs-Wrapper (NEU)
  |     |
  |     +-- Tab "Uebersicht" (bestehende PlanningPage-Inhalte)
  |     |
  |     +-- Tab "Projektplanung" (NEU)
  |           |
  |           +-- ClientProjectSelector (Dropdown: Kunde + Projekt waehlen)
  |           +-- GanttChart
  |           |     +-- GanttCalendarHeader (Monate + KW-Zeile)
  |           |     +-- GanttRow[] (Aufgabenzeilen mit Balken)
  |           |     +-- GanttMilestoneOverlay (Rauten aus bestehenden Milestones)
  |           |     +-- TodayLine (vertikale Markierung)
  |           +-- GanttTaskSheet (Aufgabe anlegen/bearbeiten)
  |           +-- GanttExportButton (PDF-Export)
```

## Implementierungsschritte

### Phase 1: Datenbank + Grundstruktur

**1. Migration: `gantt_tasks` Tabelle**
- Neue Tabelle mit RLS-Policies (user_id = auth.uid())
- FK zu `planning_projects`

**2. PlanningPage.tsx anpassen**
- Tabs-Wrapper (`<Tabs>`) um bestehenden Content
- Tab 1 "Uebersicht" = bisheriger Inhalt (unveraendert)
- Tab 2 "Projektplanung" = neue `ProjectPlanningPage`

**3. Hook: `useGanttTasks(projectId)`**
- CRUD-Operationen fuer Gantt-Aufgaben
- Folgt dem Pattern von `useMilestones`

### Phase 2: Gantt-Chart UI

**4. ProjectPlanningPage.tsx**
- Kunden-Dropdown (aus `useClients`)
- Projekt-Tabs (Projekte des gewaehlten Kunden, aus Supabase `planning_projects`)
- Leerer Zustand wenn kein Projekt ausgewaehlt

**5. GanttCalendarHeader.tsx (Kernlogik)**
- Berechnet echte KWs im Projektzeitraum via `buildIsoWeeksInRange()`
- Zeile 1: Monatsnamen mit `colspan` basierend auf Anzahl KWs im Monat
- Zeile 2: KW-Nummern (KW 5, KW 6, ...)
- Dynamische Spaltenanzahl je nach Projektlaenge

**6. GanttChart.tsx**
- CSS Grid: `grid-template-columns: 200px repeat(N, 1fr)` wobei N = Anzahl KWs
- Scrollbar bei vielen Wochen (horizontal)
- Heutiges Datum als vertikale Linie

**7. GanttRow.tsx**
- Aufgabenname links (200px)
- Farbiger Balken positioniert via `gridColumn` basierend auf Start-/End-KW
- Klick oeffnet Bearbeiten-Sheet

**8. GanttTaskSheet.tsx**
- Sheet zum Anlegen/Bearbeiten von Aufgaben
- Felder: Titel, Startdatum (Datepicker), Enddatum (Datepicker), Beschreibung, Farbe
- Datepicker zeigt Kalenderwochen an (showWeekNumber ist bereits aktiv in Calendar.tsx)

### Phase 3: Meilensteine + Interaktion

**9. GanttMilestoneOverlay.tsx**
- Bestehende Milestones des Projekts als Rauten-Marker auf der Zeitachse
- Wiederverwendung von `MILESTONE_TYPE_CONFIG` fuer Farben/Icons
- Klick oeffnet bestehendes MilestoneSheet

**10. Drag & Drop (optional, spaeter)**
- Reihenfolge der Zeilen aendern via `sort_order`

### Phase 4: PDF-Export (Druckqualitaet)

**11. exportGanttPDF.ts**
- jsPDF mit manueller Vektor-Zeichnung (keine Screenshots)
- Echte Text-Elemente = selektierbar und durchsuchbar im PDF
- A4 Querformat
- Exakte Nachbildung: Monats-Header, KW-Spalten, Balken, Rauten
- Header: Kundenname, Projektname, Zeitraum
- 1:1 wie auf dem Bildschirm

## Kalenderwochen-Berechnung (Detail)

Die bestehende Funktion `buildIsoWeeksInRange` aus `src/lib/date.ts` liefert bereits exakte ISO-Kalenderwochen. Fuer den Gantt-Header wird zusaetzlich eine Gruppierung nach Monaten benoetigt:

```typescript
// Gruppiert KWs nach Monat fuer den Header
function groupWeeksByMonth(weeks) {
  // KW 5 faellt in Februar -> Gruppe "Februar" bekommt KW 5
  // Basierend auf dem Montag (Start) der jeweiligen Woche
  return weeks.reduce((groups, week) => {
    const monthKey = format(week.start, 'yyyy-MM');
    groups[monthKey] = groups[monthKey] || { label: format(week.start, 'MMMM yyyy'), weeks: [] };
    groups[monthKey].weeks.push(week);
    return groups;
  }, {});
}
```

## Dateien-Uebersicht

| Datei | Aktion | Beschreibung |
|-------|--------|-------------|
| `supabase/migrations/xxx_gantt_tasks.sql` | Neu | Tabelle + RLS |
| `src/lib/planning/gantt-types.ts` | Neu | TypeScript-Typen fuer Gantt |
| `src/hooks/useGanttTasks.ts` | Neu | CRUD Hook |
| `src/hooks/useProjectsByClient.ts` | Neu | Projekte eines Kunden laden |
| `src/pages/app/planning/PlanningPage.tsx` | Aendern | Tabs-Wrapper hinzufuegen |
| `src/pages/app/planning/ProjectPlanningPage.tsx` | Neu | Tab-Inhalt mit Selector + Chart |
| `src/components/planning/gantt/GanttChart.tsx` | Neu | Hauptkomponente |
| `src/components/planning/gantt/GanttCalendarHeader.tsx` | Neu | Monate + KW-Spalten |
| `src/components/planning/gantt/GanttRow.tsx` | Neu | Aufgabenzeile mit Balken |
| `src/components/planning/gantt/GanttTaskSheet.tsx` | Neu | Bearbeiten-Sheet |
| `src/components/planning/gantt/GanttMilestoneOverlay.tsx` | Neu | Rauten-Marker |
| `src/components/planning/gantt/GanttExportButton.tsx` | Neu | Export-Trigger |
| `src/lib/planning/exportGanttPDF.ts` | Neu | PDF mit echten Texten |

