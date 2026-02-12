

# Gantt PDF-Export: Screen-getreues Design + Phasenbeschreibungen

## Ueberblick

Der bisherige PDF-Export zeichnet ein vereinfachtes Gantt-Diagramm mit jsPDF-Primitiven (Rechtecke, Text). Das Ergebnis weicht stark vom On-Screen-Design ab. Der neue Export soll:

1. **Denselben Zeitraum** zeigen wie auf dem Bildschirm (dynamisch berechnet, inkl. Buffer)
2. **Abgerundetes Design** mit modernem Look (rounded corners, Farb-Balken mit Opacity, Schatten-Effekte)
3. **Seite 2: Phasenbeschreibungen** mit Farbbalken-Indikator, Titel, Datum und HTML-/Text-Beschreibung
4. **Druckqualitaet** mit selektierbarem Text (echte Vektorgrafik, kein Screenshot)

## Technischer Ansatz

### Datei: `src/lib/planning/exportGanttPDF.ts` (komplett ueberarbeitet)

**Zeitraum-Berechnung (wie GanttChart.tsx):**
- Start = `project.start_date`
- End = Maximum aus `project.end_date`, dem spaetesten Task-Enddatum, + 14 Tage Buffer
- Dieselbe Logik wie in der `GanttChart`-Komponente

**Seite 1 - Gantt-Diagramm:**
- Titel-Header: Kundenname + Projektname (fett, gross)
- Monats-Header mit abgerundeten Zellen und sanftem Hintergrund
- KW-Header-Zeile darunter
- Task-Zeilen mit:
  - Label-Spalte (links, mit Completed-Checkmark wenn erledigt)
  - Farbiger Balken mit `roundedRect` und leichter Opazitaet (wie on-screen: 80% aktiv, 50% completed)
  - Meilenstein-Diamanten auf dem Balken
- Heute-Linie als vertikale Markierung
- Footer mit Erstellungsdatum und Projekt-Info
- Seitenumbruch bei vielen Tasks

**Seite 2+ - Phasenbeschreibungen:**
- Automatischer Seitenumbruch nach dem Gantt-Diagramm
- Ueberschrift "Phasenbeschreibungen"
- Fuer jede Phase mit Beschreibung:
  - Farbiger vertikaler Streifen links (wie on-screen)
  - Titel + Datumszeitraum
  - Beschreibungstext (HTML wird zu Plain-Text konvertiert fuer PDF)
  - Aufzaehlungspunkte werden als Bullet-Liste dargestellt
- Automatische Seitenumbrueche bei langen Beschreibungen

**Design-Details:**
- Abgerundete Ecken ueberall (roundedRect statt rect)
- Sanfte Farben fuer Header (wie bg-muted/30)
- Balken mit korrekter Opazitaet
- Grid-Linien als dezente vertikale Striche
- Schriftgroessen angepasst fuer bessere Lesbarkeit

### Datei: `src/components/planning/gantt/GanttPage.tsx` (minimale Aenderung)

- Die `handleExportPDF`-Funktion uebergibt zusaetzlich die `tasks`-Liste (fuer die Zeitraum-Berechnung), da der Export jetzt denselben dynamischen Zeitraum nutzt wie die UI

## HTML-zu-Text-Konvertierung

Da jsPDF keinen HTML-Renderer hat, werden HTML-Beschreibungen fuer den PDF-Export konvertiert:
- HTML-Tags werden entfernt
- `<li>`-Elemente werden zu "- " Bullet-Punkten
- `<br>` und Block-Elemente erzeugen Zeilenumbrueche
- Ueberschriften (`<h1>`-`<h3>`) werden als fette Zeilen dargestellt

## Zusammenfassung der Aenderungen

| Datei | Aenderung |
|---|---|
| `src/lib/planning/exportGanttPDF.ts` | Komplett ueberarbeitet: Screen-getreues Design, Phasenbeschreibungen auf Seite 2 |
| `src/components/planning/gantt/GanttPage.tsx` | Keine Aenderung noetig (tasks werden bereits uebergeben) |

