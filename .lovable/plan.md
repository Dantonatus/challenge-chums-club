

## Body Scan: TANITA PDF-Import integrieren

Aktuell werden nur CSV-Dateien unterstuetzt. Die hochgeladene Datei ist ein TANITA MC-780 PDF-Report mit denselben Daten. Ziel: PDF-Import nahtlos neben dem bestehenden CSV-Import ermoeglichen.

### Ansatz

Die PDF wird client-seitig mit `pdfjs-dist` (Mozilla PDF.js) geparst. Der extrahierte Text wird mit Regex-Patterns auf die bekannten TANITA-Felder gemappt.

### Neue Datei: `src/lib/bodyscan/pdfParser.ts`

Parst den extrahierten Text aus einer TANITA MC-780 PDF und gibt ein `ParsedBodyScan`-Objekt zurueck. Felder werden per Regex extrahiert:

| PDF-Text | Zielfeld |
|---|---|
| `Gewicht 95,9 kg` | `weight_kg` |
| `Fettanteil 18,9 %` | `fat_percent` |
| `Fettmasse 18,1 kg` | `fat_mass_kg` |
| `Muskelmasse 74,0 kg` | `muscle_mass_kg` |
| `Level Viszeralfett 6` | `visceral_fat` |
| `BMI 27,1` | `bmi` |
| `Stoffwechselalter 27` | `metabolic_age` |
| `Datum 10.04.2026 20:30:06` | `scan_date`, `scan_time` |
| `Knochen 3,8kg` | `bone_mass_kg` |
| `Wasser 55,3 kg` / `57,7 %` | `tbw_kg`, `tbw_percent` |
| `ECW 21,2 kg` / `ICW 34,1 kg` | `ecw_kg`, `icw_kg` |
| `ECW/TBW 38,3 %` | `ecw_tbw_ratio` |
| Segmentanalyse Fett/Muskel | `segments_json` |
| Modell MC-780 | `device` |

Deutsche Dezimalkommas (`95,9`) werden zu Punkt konvertiert.

### Aenderung: `src/components/bodyscan/BodyScanCsvUploader.tsx`

- `accept` erweitern auf `.csv,.pdf`
- Button-Label aendern zu "Importieren" (statt "CSV importieren")
- Bei `.pdf`-Dateien: `pdfjs-dist` nutzen um Text zu extrahieren, dann `parseBodyScanPdf()` aufrufen
- Bei `.csv`-Dateien: weiterhin `parseBodyScanCsv()` nutzen

### Dependency

- `pdfjs-dist` installieren (Mozilla PDF.js, ca. 400KB, client-side PDF text extraction)

### Kein DB-Schema-Aenderung noetig

Die PDF enthaelt exakt die gleichen Felder wie die CSV. Alles wird auf das bestehende `ParsedBodyScan`-Interface gemappt.

