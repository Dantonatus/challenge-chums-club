

# Modul "Projektplanung" -- Gantt-Detailansicht pro Kunde

## Zusammenfassung

Ein neuer zweiter Tab neben der bestehenden "Planung" (Horizon View). Er zeigt eine echte Gantt-Darstellung pro Kunde mit:
- Zweistufigem Header: Monate oben, darunter echte ISO-Kalenderwochen (KW)
- Aufgaben als horizontale Zeitbalken
- Meilensteine als Rauten-Overlay auf den Balken
- HQ-PDF-Export in Druckqualitat mit selektierbarem Vektor-Text (jsPDF)

Bestehende Daten und Accounts bleiben vollstandig erhalten.

---

## 1. Datenmodell (bereits vorhanden)

Die Tabellen existieren bereits mit korrekten RLS-Policies:

```text
clients (besteht)
  |
  +-- planning_projects (besteht)
  |     id, client_id, user_id, name, description
  |     start_date, end_date, status, color, sort_order
  |
  +-- gantt_tasks (besteht)
  |     id, project_id, user_id, title, description
  |     start_date (date), end_date (date)
  |     sort_order, color, is_completed
  |
  +-- milestones (besteht, hat project_id FK)
```

Keine DB-Migrationen notwendig. Alle Tabellen haben vollstandige CRUD-RLS-Policies.

---

## 2. Routing und Navigation

### 2a. PlanningPage wird zum Tab-Layout

Die bestehende `PlanningPage` wird um ein Tab-System erweitert mit zwei Tabs:
- **Planung** (bestehender Inhalt -- Horizon View)
- **Projektplanung** (neue Gantt-Ansicht)

### 2b. Keine neuen Routen notig

Alles bleibt unter `/app/planning`. Die Tabs sind interner State, kein Routing.

---

## 3. Neue Dateien

### 3a. Hook: `src/hooks/useGanttTasks.ts`
- CRUD-Hook fur `gantt_tasks` und `planning_projects`
- Queries: Tasks + Milestones fur ein `planning_project` laden
- Mutations: Create, Update, Delete fur Tasks und Projekte
- Nutzt `@tanstack/react-query` wie bestehende Hooks

### 3b. Typen: Erweiterung `src/lib/planning/types.ts`
- Interface `GanttTask` (basierend auf DB-Schema)
- Interface `PlanningProject`
- Hilfs-Typen fur die KW-Berechnung

### 3c. Hauptkomponente: `src/components/planning/gantt/GanttPage.tsx`
- Kunde auswahlen (Dropdown aus bestehenden `clients`)
- Projekt auswahlen oder neues erstellen
- Rendert den `GanttChart`

### 3d. Gantt-Chart: `src/components/planning/gantt/GanttChart.tsx`

Kernkomponente mit:

```text
+------------------------------------------------------------------+
| Januar 2026                  | Februar 2026         | Marz 2026  |
| KW1  | KW2  | KW3  | KW4    | KW5  | KW6  | KW7 ...            |
+------------------------------------------------------------------+
| Aufgabe 1         [=========]                                     |
| Aufgabe 2                    [==============]                     |
| Aufgabe 3    [===========o============]    <- o = Meilenstein     |
+------------------------------------------------------------------+
```

**Kalender-Logik:**
- Monate aus dem Projektzeitraum (`start_date` bis `end_date`)
- ISO-Kalenderwochen via `date-fns/getISOWeek` und `startOfISOWeek`
- Jede KW ist eine Spalte mit exakter Kalenderbreite
- KW-Header zeigt "KW1", "KW2" etc. (echte ISO-Wochennummern)
- Monat-Header spannt uber alle zugehorigen KWs (`colSpan`)

**Task-Balken:**
- Position und Breite berechnet aus `start_date`/`end_date` relativ zum Gesamtzeitraum
- Farbe: `task.color` oder Kundenfarbe als Fallback
- Abgeschlossene Tasks: volle Opazitat + Checkmark
- Hover: Tooltip mit Details

**Meilenstein-Rauten:**
- Aus `milestones` Tabelle (gefiltert auf `project_id`)
- Positioniert als Raute (45-Grad-rotiertes Quadrat) auf der Zeitleiste
- Overlay uber Task-Balken wenn auf selben Tag

### 3e. Task-Zeile: `src/components/planning/gantt/GanttTaskRow.tsx`
- Aufgabenname links (feste Spalte ~250px)
- Zeitbalken rechts (relative Position zur Timeline)
- Klick offnet Bearbeitungs-Sheet

### 3f. Task-Sheet: `src/components/planning/gantt/GanttTaskSheet.tsx`
- Sheet zum Erstellen/Bearbeiten eines Gantt-Tasks
- Felder: Titel, Beschreibung, Start-Datum, End-Datum, Farbe, Status
- Loschen-Button mit Bestatigung

### 3g. Projekt-Sheet: `src/components/planning/gantt/GanttProjectSheet.tsx`
- Projekt anlegen/bearbeiten fur einen Kunden
- Felder: Name, Beschreibung, Start-Datum, End-Datum, Status

### 3h. PDF-Export: `src/lib/planning/exportGanttPDF.ts`

Vektor-PDF mit jsPDF (kein Screenshot):
- Zeichnet Header, KW-Spalten, Task-Balken und Meilensteine direkt als Vektor-Grafik
- Text ist selektierbar und druckscharf
- A4-Querformat
- Kundenname + Projektname als Header
- Fusszeile mit Datum

---

## 4. Kalender-Akkuratesse (Kernlogik)

```text
Eingabe: Projektzeitraum z.B. 2026-01-05 bis 2026-03-27

1. Finde alle ISO-Wochen im Zeitraum
2. Jede Woche = 1 Spalte (gleiche Breite)
3. Monat-Header: colSpan = Anzahl KWs die in diesem Monat starten
4. KW-Header: "KW1", "KW2", ..., "KW13" (echte ISO-Nummern)
5. Task-Position: 
   - startCol = KW-Index von task.start_date
   - endCol = KW-Index von task.end_date
   - Breite = (endCol - startCol + 1) Spalten
   - Fein-Offset innerhalb der KW basierend auf Wochentag
```

Bibliothek: `date-fns` mit `getISOWeek`, `startOfISOWeek`, `eachWeekOfInterval`.

---

## 5. Implementierungsreihenfolge

1. **Types + Hook** -- `GanttTask`, `PlanningProject` Typen + `useGanttTasks` Hook
2. **GanttChart** -- Kalender-Header mit Monaten + KWs, Today-Linie
3. **GanttTaskRow** -- Task-Balken-Rendering mit korrekter Positionierung
4. **Meilenstein-Overlay** -- Rauten auf der Timeline
5. **GanttPage** -- Kunden/Projekt-Auswahl, leerer Zustand
6. **Task/Projekt Sheets** -- CRUD-Formulare
7. **Tab-Integration** -- PlanningPage um Tabs erweitern
8. **PDF-Export** -- Vektor-PDF mit jsPDF

---

## 6. Design-Prinzipien

- **Identisches Design** zur bestehenden Planung (gleiche Card-Styles, Border-Radius, Farben)
- **Progressive Disclosure**: Erst Kunde wahlen, dann Projekt, dann Tasks sehen
- **Investor-Ready Asthetik**: Clean, professionell, druckfertig
- **100% Kalender-akkurat**: Echte ISO-Kalenderwochen, keine Approximation
- **Bestehende Daten bleiben erhalten**: Kein Loschen, keine Schema-Anderungen

