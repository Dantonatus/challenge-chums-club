

# Smart Scale Dashboard -- Starfit XLS Import + Visualisierungen

## Ausgangslage

Die Starfit-Waage exportiert XLS-Dateien (trotz .csv Endung) mit 15 Metriken und mehreren Messungen pro Tag. Die aktuelle `weight_entries`-Tabelle speichert nur Gewicht mit einer Messung pro Tag. Wir brauchen eine komplett neue Datenstruktur und umfangreiche Visualisierungen.

## Datenformat der Starfit-Waage

Spalten aus der XLS-Datei:

| Feld | Beispielwert | Einheit |
|------|-------------|---------|
| Zeit | 21:15 16/02/2026 | HH:MM DD/MM/YYYY |
| Gewicht | 94.65 | kg |
| BMI | 26.8 | - |
| Koerperfettanteil | 20.9 | % |
| Unterhautfett | 18.1 | % |
| Herzfrequenz | 82 | bpm |
| Herzindex | 2.6 | L/Min/M2 |
| Bauchfett | 9.6 | Rating |
| Koerperwasser | 57.1 | % |
| Skelettmuskelanteil | 51.1 | % |
| Muskelmasse | 71.1 | kg |
| Knochenmasse | 3.74 | kg |
| Protein | 18.0 | % |
| Grundumsatz | 1986 | kcal |
| Koerperalter | 32 | Jahre |

Nicht jede Messung hat alle Werte -- manche Felder sind leer (z.B. nur HR-Messung ohne Koerperzusammensetzung).

## Mehrere Messungen pro Tag

- Alle Messpunkte werden einzeln gespeichert (mit Uhrzeit)
- Trend-Charts zeigen einzelne Punkte, Tages-Durchschnitte als dickere Linie
- KPI-Cards verwenden den jeweils letzten verfuegbaren Wert
- Morgens- vs Abend-Vergleich wo sinnvoll (z.B. Gewicht typisch morgens leichter)

## Datenbank

Neue Tabelle `smart_scale_entries`:

```text
id              uuid PK
user_id         uuid NOT NULL
measured_at     timestamptz NOT NULL     -- Datum + Uhrzeit kombiniert
weight_kg       numeric
bmi             numeric
fat_percent     numeric
subcutaneous_fat_percent  numeric
heart_rate_bpm  integer
cardiac_index   numeric
visceral_fat    numeric
body_water_percent  numeric
skeletal_muscle_percent  numeric
muscle_mass_kg  numeric
bone_mass_kg    numeric
protein_percent numeric
bmr_kcal        integer
metabolic_age   integer
created_at      timestamptz DEFAULT now()

UNIQUE(user_id, measured_at)
```

RLS-Policies: Standard-Pattern (user can CRUD own entries).

## XLS Import

- **Neue Dependency**: `xlsx` (SheetJS) -- parst binaere XLS/XLSX-Dateien im Browser
- **Parser**: `src/lib/smartscale/xlsParser.ts` -- liest das Starfit-Format, extrahiert alle Zeilen, mapped deutsche Spaltenkoepfe auf DB-Felder, gibt `ParsedScaleEntry[]` zurueck
- **Uploader-Komponente**: `src/components/smartscale/ScaleFileUploader.tsx` -- akzeptiert .xls/.xlsx/.csv, zeigt Anzahl erkannter Eintraege, bulk-upsert via Hook
- **Hook**: `src/hooks/useSmartScaleEntries.ts` -- Query + Bulk-Import-Mutation

## Visualisierungen (5 Bereiche)

### 1. Koerperzusammensetzung

KPI-Strip mit den aktuellsten Werten + Trend:

```text
[ Gewicht    ] [ Koerperfett ] [ Muskelmasse ] [ Wasser  ] [ Protein ] [ BMI    ]
  94.15 kg      20.9%           71.1 kg         57.1%       18.0%       26.8
  -0.5 7d       -0.3% 7d       +0.2 7d         +0.1% 7d    --          -0.1 7d
```

Darunter ein gestackter Area-Chart: Fettmasse vs Muskelmasse vs Knochenmasse vs Rest (Wasser/Protein) ueber die Zeit. Einzelne Messpunkte als Dots, Tagesdurchschnitt als Linie.

### 2. Herz-Kreislauf

```text
[ Herzfrequenz ] [ Herzindex     ]
  82 bpm          2.6 L/Min/M2
  Ruhe: normal    Normal
```

Linien-Chart mit HR ueber Zeit (farbcodiert: gruen <70, gelb 70-90, rot >90). Zweite Y-Achse fuer Herzindex. Tageszeitliche Verteilung als Scatter-Plot (X=Uhrzeit, Y=HR, Farbe=Tag).

### 3. Viszeralfett + Unterhautfett

```text
[ Bauchfett  ] [ Unterhautfett ]
  9.6 Rating    18.1%
  Erhoehtes R.  Trend: stabil
```

Dual-Line-Chart mit Referenzbereichen (gruen/gelb/rot Zonen fuer Viszeralfett-Rating). Unterhautfett als zweite Linie.

### 4. Stoffwechsel

```text
[ Grundumsatz ] [ Koerperalter ]
  1986 kcal      32 Jahre
  +12 kcal 7d    vs. echt: 30
```

Trend-Chart BMR ueber Zeit. Metabolisches Alter vs echtes Alter als Vergleichsbalken.

### 5. Gewichtsverlauf (erweitert)

Der bestehende WeightTerrainChart wird weiterhin die manuellen `weight_entries` anzeigen. Zusaetzlich werden Smart-Scale-Gewichtswerte als Overlay eingeblendet, damit man ein vollstaendiges Bild hat. Tagesdurchschnitt-Linie glaettet die Mehrfachmessungen.

## Dateien und Aenderungen

| Datei | Aenderung |
|-------|-----------|
| **Neue Dateien** | |
| `src/lib/smartscale/types.ts` | TypeScript-Interfaces fuer SmartScaleEntry + ParsedScaleEntry |
| `src/lib/smartscale/xlsParser.ts` | XLS/XLSX Parser mit SheetJS, mapped Starfit-Spalten |
| `src/lib/smartscale/analytics.ts` | Hilfsfunktionen: Tagesdurchschnitt, Trends, Referenzbereiche |
| `src/hooks/useSmartScaleEntries.ts` | Query + Bulk-Upsert Hook |
| `src/components/smartscale/ScaleFileUploader.tsx` | Upload-Button fuer XLS-Dateien |
| `src/components/smartscale/ScaleKPIStrip.tsx` | KPI-Cards fuer alle 6 Hauptmetriken |
| `src/components/smartscale/BodyCompositionChart.tsx` | Stacked Area: Fett/Muskel/Knochen/Wasser |
| `src/components/smartscale/HeartHealthChart.tsx` | HR + Herzindex Dual-Axis Chart |
| `src/components/smartscale/VisceralFatChart.tsx` | Viszeralfett + Unterhautfett mit Zonen |
| `src/components/smartscale/MetabolismChart.tsx` | BMR-Trend + Koerperalter-Vergleich |
| `src/components/smartscale/DailyComparisonCard.tsx` | Morgen vs Abend Gewichts-Diff |
| **Bestehende Dateien** | |
| `src/pages/app/training/WeightPage.tsx` | Smart-Scale-Sektionen unterhalb der bestehenden Gewichts-UI einbauen, Uploader in Header |
| `package.json` | Dependency `xlsx` hinzufuegen |
| **Migration** | Neue Tabelle `smart_scale_entries` mit RLS |

## Reihenfolge

1. DB-Migration (Tabelle + RLS)
2. `xlsx` Dependency installieren
3. Types + Parser + Analytics
4. Hook
5. Uploader-Komponente
6. Visualisierungs-Komponenten (5 Bereiche)
7. WeightPage Integration

