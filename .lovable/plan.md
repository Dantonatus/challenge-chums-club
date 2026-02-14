

# PDF-Export Fix: Echte 1:1 Screenshots

## Problem

1. `addPageBg()` wird NACH dem Zeichnen aufgerufen und uebermalt den gesamten Inhalt mit der Hintergrundfarbe -- deshalb ist alles schwarz.
2. KPI-Cards, Bubble-Heatmap und Personal Records werden programmatisch gezeichnet statt als Screenshots erfasst -- sie sehen anders aus als in der App.
3. Chart-Captures scheitern leise (Error wird verschluckt), daher fehlen die Diagramme.

## Loesung

Komplett neuer Ansatz: ALLE sichtbaren Sektionen der Seite werden per `html-to-image` als PNG erfasst und 1:1 ins PDF eingebettet. Kein programmatisches Zeichnen mehr. Das PDF sieht exakt so aus wie die App.

## Technische Umsetzung

### TrainingPage.tsx -- Refs auf ALLE Sektionen

Neue Refs fuer:
- KPI-Cards
- TimeBubbleHeatmap
- PersonalRecords
- (Die 6 Chart-Refs bleiben)

Alle 9 Sektionen werden nacheinander per `toPng()` erfasst und als Array an `exportTrainingPDF()` uebergeben.

### exportTrainingPDF.ts -- Radikal vereinfacht

Die gesamte programmatische Zeichenlogik (KPI-Boxen, Heatmap-Circles, Record-Cards) wird entfernt. Die Funktion macht nur noch:

1. Theme-Hintergrundfarbe lesen
2. Header-Balken zeichnen (Titel + Zeitraum)
3. Alle uebergebenen Screenshot-Bilder nacheinander einbetten mit `doc.addImage()`
4. Automatische Seitenumbrueche basierend auf Bildhoehe
5. Footer mit Zeitstempel

Das ist ca. 60 Zeilen Code statt 350.

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/pages/app/training/TrainingPage.tsx` | 3 neue Refs (kpiRef, heatmapRef, recordsRef), alle 9 Sektionen capturen |
| `src/lib/training/exportTrainingPDF.ts` | Radikal vereinfacht: nur Header + Bilder einbetten + Footer. Keine programmatische Zeichenlogik mehr |

