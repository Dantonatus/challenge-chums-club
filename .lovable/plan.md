

# Body Scan Seite: TANITA Koerperanalyse

## Uebersicht

Neue Seite "Body Scan" neben der bestehenden Training-Seite, erreichbar ueber einen Tab-Toggle im Header. Importiert TANITA MC-780 CSV-Dateien und zeigt Koerperkompositions-Daten mit Verlaufs-Analysen an.

## CSV-Datenstruktur (TANITA MC-780)

Jede CSV-Datei = 1 Scan mit 26 Messwerten in diesen Kategorien:

| Kategorie | Metriken |
|---|---|
| details | weight, fat_percent, fat_mass, muscle_mass, bone_mass, bmi, metabolic_age |
| composition | tbw (kg + %), ecw, icw, ecw_tbw_ratio |
| metabolism | bmr (kJ + kcal) |
| risk | visceral_fat_rating |
| segment_muscle | muscle_mass fuer trunk, arm L/R, leg L/R |
| segment_fat | fat_percent fuer trunk, arm L/R, leg L/R |
| physique | physique_rating (Text) |

## Visualisierungen

### 1. KPI-Cards (6 Karten, wie bei Training)
- Gewicht (aktuell + Differenz zum ersten Scan)
- Koerperfett % (aktuell + Trend)
- Muskelmasse kg (aktuell + Trend)
- BMI (aktuell + Zielbereich-Indikator)
- Metabolisches Alter (aktuell vs. echtes Alter)
- Viszeralfett-Rating (Score)

### 2. Koerperkomposition Verlauf (Line Chart)
- X-Achse: Scan-Datum
- Y-Achsen: Gewicht, Muskelmasse, Fettmasse als Linien
- Zeigt den Verlauf ueber alle importierten Scans

### 3. Koerperfett vs. Muskelmasse Trend (Dual-Axis Area Chart)
- Fett-% und Muskelmasse kg im Zeitverlauf
- Mit Zielbereich als schraffiertem Band

### 4. Segment-Analyse: Muskelverteilung (Radar/Bar Chart)
- Muskelmasse pro Segment: Trunk, Arm L, Arm R, Leg L, Leg R
- Letzter Scan als Balken, optional Vergleich zum vorherigen Scan

### 5. Segment-Analyse: Fettverteilung (Bar Chart)
- Fett-% pro Segment mit demselben Layout

### 6. Stoffwechsel-Karte (einzelne Card)
- BMR in kcal, Wasseranteil %, ECW/ICW-Ratio

### 7. Scan-Uebersicht (Tabelle/Timeline)
- Alle importierten Scans chronologisch
- Klick zeigt Detailwerte

## Technische Umsetzung

### Datenbank

Neue Tabelle `body_scans`:

```text
id              uuid PK default gen_random_uuid()
user_id         uuid NOT NULL
scan_date       text NOT NULL (YYYY-MM-DD)
scan_time       text NOT NULL (HH:MM)
device          text NOT NULL
age_years       integer
height_cm       numeric
weight_kg       numeric
fat_percent     numeric
fat_mass_kg     numeric
muscle_mass_kg  numeric
bone_mass_kg    numeric
bmi             numeric
metabolic_age   integer
tbw_kg          numeric
tbw_percent     numeric
ecw_kg          numeric
icw_kg          numeric
ecw_tbw_ratio   numeric
bmr_kcal        numeric
visceral_fat    integer
physique_text   text
segments_json   jsonb          -- { muscle: {trunk, armL, armR, legL, legR}, fat: {trunk, armL, armR, legL, legR} }
created_at      timestamptz default now()
UNIQUE(user_id, scan_date, scan_time)
```

RLS-Policies: Users can CRUD own scans (gleich wie training_checkins).

### Neue Dateien

| Datei | Zweck |
|---|---|
| `src/lib/bodyscan/types.ts` | TypeScript-Interfaces fuer BodyScan |
| `src/lib/bodyscan/csvParser.ts` | Parser fuer TANITA CSV-Format |
| `src/lib/bodyscan/analytics.ts` | Berechnungen fuer KPIs und Chart-Daten |
| `src/hooks/useBodyScans.ts` | Query + Import-Mutation (wie useTrainingCheckins) |
| `src/pages/app/training/BodyScanPage.tsx` | Haupt-Page mit allen Visualisierungen |
| `src/components/bodyscan/BodyScanKPICards.tsx` | 6 KPI-Karten |
| `src/components/bodyscan/CompositionTrendChart.tsx` | Gewicht/Muskel/Fett Verlauf |
| `src/components/bodyscan/FatMuscleAreaChart.tsx` | Fett% vs Muskelmasse Trend |
| `src/components/bodyscan/SegmentMuscleChart.tsx` | Muskelverteilung pro Segment |
| `src/components/bodyscan/SegmentFatChart.tsx` | Fettverteilung pro Segment |
| `src/components/bodyscan/MetabolismCard.tsx` | BMR + Wasseranteil Card |
| `src/components/bodyscan/ScanTimeline.tsx` | Chronologische Scan-Liste |
| `src/components/bodyscan/BodyScanCsvUploader.tsx` | CSV-Import-Button |

### Bestehende Dateien aendern

| Datei | Aenderung |
|---|---|
| `src/pages/app/training/TrainingPage.tsx` | Tab-Toggle "Check-ins / Body Scan" im Header hinzufuegen |
| `src/App.tsx` | Neue Route `/app/training/bodyscan` hinzufuegen |
| `src/components/layout/AppLayout.tsx` | Keine Aenderung noetig (Training-Link bleibt) |

### Navigation

Im Training-Header ein Toggle mit zwei Buttons:
- **Check-ins** (bestehende Seite)
- **Body Scan** (neue Seite)

Implementiert als einfache Tabs-Komponente oder als zwei Sub-Routes unter `/app/training`.

### CSV-Parser Logik

Der Parser liest die TANITA-CSV und extrahiert alle 26 Zeilen in ein einzelnes `BodyScan`-Objekt:

```text
1. Header-Zeile skippen
2. Alle Zeilen nach category/metric/submetric/side_or_segment gruppieren
3. Werte in ein flaches Objekt mappen:
   - details.weight -> weight_kg
   - details.fat_percent -> fat_percent
   - segment_muscle.muscle_mass.arm.L -> segments_json.muscle.armL
   - etc.
4. Ein einzelnes BodyScan-Objekt zurueckgeben
```

### Design-Prinzipien

- Gleiche Card-Komponenten (`Card`, `CardContent`) wie Training
- Gleiche Recharts-Konfiguration (Farben, Tooltips, Responsive Container)
- Gleiche KPI-Card-Struktur (Icon + Label + Wert + Sub-Text)
- Gleicher `-m-3 p-3` Wrapper fuer PDF-Export-Kompatibilitaet

