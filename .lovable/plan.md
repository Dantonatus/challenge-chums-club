

# Projektplanung Gantt-Chart: 3 Verbesserungen

## Problem-Analyse

Basierend auf den BITO-Daten wurden drei Probleme identifiziert:

1. **Abgeschnittene Aufgabennamen**: Die Label-Spalte ist auf 220px fixiert. Lange Phasennamen wie "Phase 2: Datenbereitstellung & Validierung" werden abgeschnitten.
2. **Zeitraum-Begrenzung**: Der Chart-Zeitraum basiert nur auf dem Projekt-Enddatum. Wenn Aufgaben daruber hinausgehen oder das Projekt laenger wird, fehlt die Flexibilitat.
3. **Fehlende Phasenbeschreibungen**: Die detaillierten Beschreibungen der Aufgaben (z.B. Bullet-Listen der Arbeitspakete) sind nur im Edit-Sheet sichtbar, nicht direkt unter dem Chart.

---

## Geplante Aenderungen

### 1. Bessere Lesbarkeit der Aufgabennamen

- **Label-Spalte verbreitern**: Von 220px auf 280px
- **Mehrzeilige Labels**: Zeilenhoehe erhoehen (44px auf 56px), Text-Wrapping aktivieren (statt `truncate` wird `line-clamp-2` verwendet)
- Betrifft: `GanttChart.tsx` (LABEL_COL_WIDTH), `GanttTaskRow.tsx` (ROW_HEIGHT, CSS)

### 2. Dynamischer Zeitraum

- Der Chart-Zeitraum wird aus dem Maximum von Projekt-Enddatum UND dem spaetesten Task-Enddatum berechnet
- Zusaetzlich 2 Wochen Puffer am Ende fuer bessere Uebersicht
- Betrifft: `GanttChart.tsx` (weeks-Berechnung im useMemo)

### 3. Strukturierte Phasenbeschreibungen unter dem Chart

- Neues `GanttPhaseDescriptions`-Komponente unterhalb des Gantt-Charts
- Jede Aufgabe mit Beschreibung wird als Karte dargestellt:
  - Farbiger Seitenstreifen (Aufgabenfarbe / Kundenfarbe)
  - Titel + Zeitraum als Header
  - Beschreibungstext mit Markdown-aehnlicher Formatierung (Aufzaehlungszeichen werden erkannt und als Liste dargestellt)
- Aufgaben ohne Beschreibung werden uebersprungen
- Betrifft: Neue Datei `GanttPhaseDescriptions.tsx`, Integration in `GanttPage.tsx`

---

## Technische Details

### Dateien die geaendert werden:

| Datei | Aenderung |
|-------|-----------|
| `src/components/planning/gantt/GanttChart.tsx` | LABEL_COL_WIDTH auf 280px, dynamische Zeitraum-Berechnung |
| `src/components/planning/gantt/GanttTaskRow.tsx` | ROW_HEIGHT auf 56px, `line-clamp-2` statt `truncate` |
| `src/components/planning/gantt/GanttPhaseDescriptions.tsx` | Neue Komponente fuer Phasenbeschreibungen |
| `src/components/planning/gantt/GanttPage.tsx` | Integration der Phase-Beschreibungen unter dem Chart |

### Keine Datenbank-Aenderungen noetig
Alle Daten (Beschreibungen, Daten) sind bereits in der `gantt_tasks`-Tabelle vorhanden.

