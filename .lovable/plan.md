

## PDF-Report: Aktuell angezeigten Zeitraum verwenden

### Problem
`handleExport` übergibt `scans` (alle Scans) an `exportBodyScanPDF`. Der Report-Header zeigt daher "12. Mai 2015 – 10. Apr. 2026" statt des aktuell gefilterten Zeitraums.

### Lösung
Eine Zeile ändern in `src/pages/app/training/BodyScanPage.tsx`:

Zeile 97: `await exportBodyScanPDF(scans, images)` → `await exportBodyScanPDF(filteredScans, images)`

Das war's — die `exportBodyScanPDF`-Funktion berechnet den Datumsbereich bereits aus den übergebenen Scans. Wenn `filteredScans` übergeben wird, zeigt der Header automatisch den korrekten gefilterten Zeitraum.

