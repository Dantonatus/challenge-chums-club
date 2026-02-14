
# PDF-Export fuer Training Report

## Konzept

Ein professioneller, druckfertiger PDF-Report ("Training Report") mit jsPDF, der alle wichtigen Kennzahlen und Analysen auf 1-2 Seiten buendelt. Der Export-Button erscheint neben dem CSV-Import-Button.

## Layout des PDFs

### Seite 1

1. **Header-Balken** (blau, volle Breite): Titel "Trainingsbericht" + Zeitraum (erster bis letzter Check-in)
2. **KPI-Streifen** (4-6 Boxen nebeneinander): Gesamt-Besuche, Diesen Monat, Oe pro Woche, Laengste Streak, Aktuelle Streak, Lieblings-Zeit
3. **Bubble-Heatmap als Tabelle**: Wochentag x Zeitslot-Matrix mit gefuellten Kreisen (via jsPDF circle-Zeichnung), Groesse proportional zum Count
4. **Persoenliche Rekorde**: 4 Boxen (Fruehester/Spaetester Check-in, Aktivster Tag, Laengste Pause)

### Seite 2 (falls noetig)

5. **Besuche pro Woche** als Balken-Tabelle (autoTable)
6. **Wochentags-Verteilung** als Balken-Tabelle
7. **Monatsvergleich** als Tabelle
8. **Ruhetage-Verteilung** als Tabelle
9. **Footer** mit Generierungszeitpunkt

## Technische Umsetzung

### Neue Dateien

| Datei | Beschreibung |
|---|---|
| `src/lib/training/exportTrainingPDF.ts` | Komplette PDF-Generierung mit jsPDF + autoTable. Nutzt alle bestehenden Analytics-Funktionen. Zeichnet die Heatmap-Bubbles als SVG-Kreise direkt ins PDF. |

### Geaenderte Dateien

| Datei | Aenderung |
|---|---|
| `src/pages/app/training/TrainingPage.tsx` | Neuer "PDF Export"-Button neben dem CSV-Import-Button. Ruft `exportTrainingPDF(checkins)` auf. |

### Details zur PDF-Generierung

- **Format**: A4 Hochformat (210x297mm)
- **Bibliotheken**: jsPDF + jspdf-autotable (bereits installiert)
- **Heatmap im PDF**: Fuer jede Zelle mit Daten wird `doc.circle(x, y, radius, 'F')` gezeichnet, Radius skaliert nach Count, Farbe in Blauabstufungen
- **KPI-Boxen**: Gezeichnet als abgerundete Rechtecke mit `doc.roundedRect()` und Text zentriert darin
- **Persoenliche Rekorde**: 4 kleine Boxen mit Icon-Emoji + Wert
- **Tabellen**: Via autoTable mit dem gleichen Styling wie im bestehenden Challenge-Export (blauer Header, alternating rows)
- **Dateiname**: `training-report-YYYY-MM-DD.pdf`

### Ablauf im Code

```text
exportTrainingPDF(checkins: TrainingCheckin[])
  |
  +-- Berechne alle Analytics (KPIs, Heatmap, Records, etc.)
  +-- Seite 1: Header + KPIs + Heatmap-Grid + Records
  +-- Seite 2: Tabellen (Wochen, Wochentage, Monate, Ruhetage)
  +-- Footer mit Zeitstempel
  +-- doc.save('training-report-YYYY-MM-DD.pdf')
```
