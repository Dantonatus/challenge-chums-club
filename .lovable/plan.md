## Neue Datengrundlage vollständig einbetten

Direkter Server-seitiger Import per SQL-`INSERT ... ON CONFLICT DO NOTHING`. Keine Duplikate, keine Überschreibung, keine Code-Änderungen an der App.

### Ist-Stand (dein User)
| Tabelle | aktuell | Neuer Upload | Erwartet nach Import |
|---|---|---|---|
| `training_checkins` | 49 | 100 Zeilen (CSV) | 100 (Duplikate übersprungen) |
| `smart_scale_entries` | 58 | 102 Zeilen (XLS) | 102 (Duplikate übersprungen) |
| `body_scans` | 11 (bis 10.04.2026) | 2 neue TANITA-PDFs | 13 |

### Schritt 1 – Check-ins
`checkin_reports_15-Juli-2026_20-04-53.csv` → 100 Zeilen parsed (deutsches Datumsformat "02 Januar 2026"), alle Black & White Fitness Worms, Zeitraum 02.01.2026 – 14.07.2026. `ON CONFLICT (user_id, checkin_date, checkin_time) DO NOTHING`.

### Schritt 2 – Smart-Scale (Starfit XLS)
`Starfit-Dante-5.csv` ist real ein XLS-Binary mit 102 Messungen (16.02.2026 – 15.07.2026). Parser: Python xlrd → Zeit "HH:MM DD/MM/YYYY" nach ISO. Einheiten (`kg`, `%`, `bpm`, `L/min/㎡`) werden gestrippt. `- -` → NULL. `ON CONFLICT (user_id, measured_at) DO NOTHING`.

### Schritt 3 – TANITA PDFs (bereits ausgelesen)

**Scan 1 – 17.06.2026 19:41:47 (MC-780)**
```text
Gewicht 89,9 kg | Fett 16,7 % / 15,0 kg | FFM 74,9 kg | Muskel 71,2 kg
Skelettmuskel 43,8 kg | BMI 25,4 | Viszeralfett 5 | Stoffwechselalter 22
Wasser 52,9 kg (58,8 %) | ECW 20,2 | ICW 32,7 | ECW/TBW 38,2 %
Knochen 3,7 kg | Grundumsatz 2198 kcal
Segment Fett %:  Rumpf 17,6 | ArmR 14,0 | ArmL 15,3 | BeinR 15,7 | BeinL 16,2
Segment Muskel kg: Rumpf 39,3 | ArmR 4,4 | ArmL 4,3 | BeinR 11,7 | BeinL 11,5
```

**Scan 2 – 12.07.2026 11:40:46 (MC-780)**
```text
Gewicht 88,4 kg | Fett 16,3 % / 14,4 kg | FFM 74,0 kg | Muskel 70,4 kg
Skelettmuskel 43,3 kg | BMI 25,0 | Viszeralfett 4 | Stoffwechselalter 21
Wasser 52,3 kg (59,2 %) | ECW 20,0 | ICW 32,3 | ECW/TBW 38,2 %
Knochen 3,6 kg | Grundumsatz 2168 kcal
Segment Fett %:  Rumpf 16,5 | ArmR 11,7 | ArmL 12,9 | BeinR 17,4 | BeinL 18,2
Segment Muskel kg: Rumpf 38,7 | ArmR 4,6 | ArmL 4,6 | BeinR 11,4 | BeinL 11,1
```

Insert in `body_scans` mit `segments_json` als JSONB `{muscle:{trunk,armL,armR,legL,legR}, fat:{...}}` (Struktur = bestehende BodyScanSegments). `ON CONFLICT (user_id, scan_date, scan_time) DO NOTHING`.

### Sicherheit
- Keine App-Code-Änderungen, keine Migrationen, keine Schema-Änderungen.
- Alle Inserts sind idempotent (ON CONFLICT DO NOTHING) → mehrfach ausführbar ohne Nebenwirkung.
- Nach Import: Verifikations-`SELECT count(*)` auf alle drei Tabellen + Datumsbereich der neuen Scans, damit die Zahlen exakt bestätigt werden.

### Nicht enthalten
Keine Änderungen an Body-Scan/Weight/Training UI. Der PeriodNavigator zeigt die neuen Daten automatisch, weil sie in denselben Tabellen liegen.
