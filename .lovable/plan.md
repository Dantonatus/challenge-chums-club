

# PDF-Export: Phasenbeschreibungen auf eine Seite + einheitliche Schrift

## Probleme im aktuellen Export

1. **Phasenbeschreibungen verteilen sich auf 2 Seiten** (Seite 2 und 3) statt auf eine einzige Seite zu passen
2. **Unterschiedliche Schriften** werden angezeigt -- vermutlich durch Unicode-Zeichen wie das Bullet "bullet" das jsPDF nicht korrekt mit Helvetica rendert

## Loesung

### Datei: `src/lib/planning/exportGanttPDF.ts`

**1. Kompakteres Layout fuer Phasenbeschreibungen:**
- Reduzierte Abstaende zwischen den Karten: von 3mm auf 1.5mm
- Weniger internes Padding: `estH`-Basis von 14 auf 11 reduzieren
- Zeilenhoehe von 3.5mm auf 3.0mm reduzieren
- Kleinere Schriftgroessen: `descTitle` von 8.5 auf 7.5, `desc` von 7 auf 6
- Titel-Abstand zum Datum reduzieren
- Header-Gap auf der Beschreibungsseite reduzieren

**2. Einheitliche Schrift (Helvetica):**
- Bullet-Zeichen von Unicode "bullet" auf ASCII-Bindestrich "-" aendern, da jsPDF bei Helvetica keine Unicode-Bullets korrekt darstellt
- Sicherstellen, dass ueberall konsistent `helvetica` als Font gesetzt wird
- Alle `setFont`-Aufrufe pruefen und vereinheitlichen

**3. Gantt-Diagramm minimal groesser:**
- `ROW_H.task` von 9 auf 10mm erhoehen fuer bessere Lesbarkeit
- `LABEL_W` von 52 auf 54mm fuer laengere Phasen-Namen

## Zusammenfassung

| Aenderung | Detail |
|---|---|
| Zeilenhoehe Beschreibungen | 3.5mm nach 3.0mm |
| Kartenabstand | 3mm nach 1.5mm |
| Schriftgroesse Beschreibung | 7pt nach 6pt, Titel 8.5pt nach 7.5pt |
| Bullet-Zeichen | Unicode bullet nach ASCII "-" |
| Gantt Task-Zeilen | 9mm nach 10mm |
| Label-Spalte | 52mm nach 54mm |

