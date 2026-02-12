

# PDF-Export: Phase 4 vollstaendig anzeigen + Beschreibungen auf eine Seite

## Probleme

1. **Phase 4 abgeschnitten im Gantt**: "Phase 4: Gemeinsamer Review &" - der Rest des Titels fehlt, weil nur `labelLines[0]` gerendert wird (Zeile 187). Bei langen Titeln wird die zweite Zeile ignoriert.
2. **Beschreibungen auf 3 Seiten verteilt** statt auf eine Seite zu passen (Phase 5 ist allein auf Seite 3).
3. **Formatierung weicht ab**: Die On-Screen-Ansicht zeigt HTML-Beschreibungen mit korrekter Formatierung (Aufzaehlungen, Absaetze), der PDF-Export hat teilweise andere Darstellung.

## Loesung

### Datei: `src/lib/planning/exportGanttPDF.ts`

**1. Mehrzeilige Labels im Gantt-Chart:**
- Statt nur `labelLines[0]` zu rendern, werden bis zu 2 Zeilen dargestellt
- Die Task-Zeilenhoehe (`ROW_H.task`) bleibt bei 10mm, aber der Text wird vertikal zentriert fuer 1 oder 2 Zeilen
- Schriftgroesse fuer Labels leicht reduzieren (6.5 -> 6pt) damit mehr Text passt
- Alternativ: `LABEL_W` von 54 auf 58mm erhoehen damit laengere Titel in eine Zeile passen

**2. Beschreibungen kompakter - alles auf eine Seite:**
- `estH` Basis von 11 auf 9 reduzieren (weniger Padding oben/unten)
- Zeilenhoehe von 3.0mm auf 2.6mm reduzieren
- Kartenabstand von 1.5mm auf 1.0mm reduzieren
- `minHeight` von 18mm auf 14mm reduzieren
- Schriftgroesse `desc` bei 6pt belassen, aber `descTitle` von 7.5 auf 7pt
- Titel und Datum naeh er zusammen (ty-Offset anpassen)

**3. Formatierung naeher an On-Screen-Darstellung:**
- Sicherstellen, dass alle `setFont`-Aufrufe konsistent `helvetica` verwenden
- Eingerueckte Unter-Bullets (z.B. "- - Service-Level...") als eingerueckte Zeilen darstellen statt mit doppeltem Strich
- HTML-Parser verbessern: verschachtelte Listen korrekt erkennen

## Zusammenfassung

| Aenderung | Detail |
|---|---|
| Label im Gantt | Bis zu 2 Zeilen anzeigen statt nur eine, LABEL_W auf 58mm |
| Beschreibung estH | 11 -> 9mm Basis |
| Zeilenhoehe Beschreibung | 3.0 -> 2.6mm |
| Kartenabstand | 1.5 -> 1.0mm |
| Min-Hoehe Karte | 18 -> 14mm |
| descTitle Font | 7.5 -> 7pt |
| Verschachtelte Bullets | Korrekte Einrueckung |

