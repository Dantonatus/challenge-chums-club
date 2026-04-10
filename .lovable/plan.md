

## Body Scan PDF: 1:1 Screenshot-Export wie die App-UI

### Konzept
Der PDF-Export soll exakt so aussehen wie die App — ein "True 1:1" HQ-Screenshot-Ansatz. Die Vektor-KPI-Tabelle wird entfernt. Stattdessen werden alle UI-Sektionen (inkl. KPI-Cards) als hochaufloeste PNG-Screenshots in das PDF eingebettet. Beim Export werden die Datenlabels (`showLabels`) temporaer aktiviert, damit die Zahlen elegant in den Charts erscheinen.

### Aenderungen

#### 1. `src/pages/app/training/BodyScanPage.tsx`
- **`kpiRef` wieder hinzufuegen** als Ref auf den KPI-Cards-Container
- KPI-Cards als erste Sektion in `pdfSections` aufnehmen: `{ label: 'Kennzahlen', ref: kpiRef }`
- **Temporaer `showLabels = true` setzen** waehrend des Exports, damit alle Charts ihre Datenwerte anzeigen
- Nach dem Export den urspruenglichen `showLabels`-Zustand wiederherstellen
- Kurze Wartezeit (`await new Promise(r => setTimeout(r, 300))`) nach dem Setzen von `showLabels`, damit React die Labels rendern kann bevor die Screenshots erstellt werden

#### 2. `src/lib/bodyscan/exportBodyScanPDF.ts`
- **`drawKPISummary` komplett entfernen** — keine Vektor-Tabelle mehr
- Die gesamte erste Seite wird vereinfacht: Header-Bar + dann direkt die Screenshot-Sektionen
- Jede Sektion wird randlos (ohne extra Rahmen) als Bild eingebettet — die UI-Karten haben bereits eigene Borders/Schatten
- Sektions-Titel und Accent-Underlines **beibehalten** (die sehen gut aus)
- Layout-Logik: Jede Sektion bekommt so viel Platz wie noetig, automatischer Seitenumbruch

### Ergebnis
- Seite 1: Header + KPI-Cards Screenshot + Komposition-Chart (mit Zahlen)
- Folgeseiten: Restliche Charts, Anatomie, Stoffwechsel, Timeline — alle mit eingebetteten Datenwerten
- Alles in 3x PNG-Qualitaet, exakt wie in der App

### Dateien

| Datei | Aenderung |
|---|---|
| `src/pages/app/training/BodyScanPage.tsx` | kpiRef zurueck, showLabels temporaer aktivieren beim Export |
| `src/lib/bodyscan/exportBodyScanPDF.ts` | drawKPISummary + Segment-Tabelle entfernen, reiner Screenshot-Ansatz |

