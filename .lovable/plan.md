

# Fix: XLS-Parser erkennt keine Werte mit Einheiten

## Problem

Der XLS-Parser kann die meisten Messwerte nicht lesen, weil die Starfit-Waage Einheiten direkt an die Zahlen anhaengt:

| Wert in Datei | Was der Parser daraus macht | Grund |
|---|---|---|
| `94.65kg` | `null` | `Number("94.65kg")` = NaN |
| `20.9%` | `null` | `Number("20.9%")` = NaN |
| `82bpm` | `null` | `Number("82bpm")` = NaN |
| `2.6L/Min/M²` | `null` | `Number("2.6L/Min/M²")` = NaN |
| `26.8` | `26.8` | Kein Suffix -- funktioniert |
| `9.6` | `9.6` | Kein Suffix -- funktioniert |

Deshalb sind in der Datenbank nur BMI, Bauchfett und Koerperalter gespeichert -- alle anderen 12 Metriken sind `null`.

**Auswirkung**: Kein Gewicht in der unified Timeline (da `weight_kg` null), keine KPIs, keine Charts, kein Herzfrequenz-Tab.

## Loesung

### 1. `toNum()` Funktion reparieren

In `src/lib/smartscale/xlsParser.ts` die `toNum` Funktion erweitern, sodass sie gaengige Einheiten-Suffixe entfernt bevor sie den Wert parst:

- Bekannte Suffixe: `kg`, `%`, `bpm`, `kcal`, `L/Min/M²`, `L/Min/M2`
- Regex: Alles nach der letzten Ziffer (oder Punkt) abschneiden
- Beispiel: `"94.65kg"` -> `94.65`, `"82bpm"` -> `82`, `"2.6L/Min/M²"` -> `2.6`

### 2. Bestehende Daten korrigieren

Die aktuell importierten Daten in der DB sind fehlerhaft (fast alles `null`). Nach dem Parser-Fix muss der Nutzer die Datei erneut importieren. Da `UPSERT` auf `(user_id, measured_at)` laeuft, werden die bestehenden Zeilen mit den korrekten Werten ueberschrieben.

### 3. CSV-Import unterstuetzen

Der Nutzer erwaehnt, dass die Daten "immer in diesem Format als CSV" kommen. Die Datei ist zwar binaer XLS (trotz .csv-Endung), aber wir sollten auch echte CSV-Dateien unterstuetzen fuer den Fall, dass sich das Format aendert. Der aktuelle Parser handhabt das bereits ueber SheetJS -- es muss nur sichergestellt werden, dass `toNum` auch bei CSV-geparsten Werten korrekt funktioniert.

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/lib/smartscale/xlsParser.ts` | `toNum()` Funktion: Einheiten-Suffixe (kg, %, bpm, kcal, L/Min/M², etc.) vor dem Parsen entfernen |

Nur eine einzige Datei muss geaendert werden. Nach dem Fix: Datei erneut importieren.

