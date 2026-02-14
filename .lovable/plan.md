

# Neues Modul: Training

## Konzept

Ein neues "Training"-Modul, das Check-in-Daten aus dem Fitnessstudio visualisiert. Die CSV-Datei wird direkt im Browser hochgeladen und geparst (kein Server-Upload noetig). Die Daten werden in einer Datenbank-Tabelle gespeichert, damit sie persistent sind und bei erneutem Upload aktualisiert werden (Duplikate anhand Datum+Zeit erkennen).

## Datenstruktur der CSV

Jede Zeile enthaelt:
- **Datum** (z.B. "02 Januar 2026")
- **Zeit** (z.B. "19:26:52")
- **Name der Einrichtung** (Gym-Name)
- **Adresse**

## Datenbank-Tabelle: `training_checkins`

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid (PK) | -- |
| user_id | uuid | RLS-Zuordnung |
| checkin_date | text | Datum im Format YYYY-MM-DD |
| checkin_time | text | Uhrzeit HH:MM:SS |
| facility_name | text | Name des Studios |
| facility_address | text | Adresse |
| created_at | timestamptz | -- |

Unique-Constraint auf `(user_id, checkin_date, checkin_time)` um Duplikate beim erneuten Upload zu vermeiden (Upsert-Logik).

## Analytics & Charts

Aus den 24 Datenpunkten lassen sich folgende Analysen ableiten:

### 1. KPI-Karten (oben)
- **Gesamt-Besuche** (z.B. 24)
- **Besuche diesen Monat** vs. letzten Monat
- **Durchschnittliche Besuche pro Woche**
- **Laengste Streak** (aufeinanderfolgende Tage mit mindestens 1 Besuch)
- **Haeufigste Uhrzeit** (Zeitfenster-Bucket)

### 2. Besuche pro Woche (Balkendiagramm)
- X-Achse: Kalenderwoche, Y-Achse: Anzahl Besuche
- Zeigt Trainingsvolumen ueber Zeit

### 3. Uhrzeiten-Verteilung (Balkendiagramm oder Donut)
- Zeitfenster-Buckets: Morgens (6-12), Mittags (12-15), Nachmittags (15-18), Abends (18-21), Spaet (21+)
- Zeigt wann bevorzugt trainiert wird

### 4. Wochentags-Heatmap
- Montag bis Sonntag als Spalten
- Zeigt welche Tage am beliebtesten sind

### 5. Monatsvergleich (Balkendiagramm)
- Besuche pro Monat nebeneinander
- Trend erkennen

### 6. Aktuelle Streak & Kalender-Ansicht
- Kleiner Kalender mit markierten Trainingstagen
- Aktuelle und laengste Streak hervorgehoben

## CSV-Upload Workflow

1. Button "CSV importieren" oben auf der Seite
2. Datei auswaehlen -- Parsing im Browser (kein Edge Function noetig)
3. Deutsche Datumsformate parsen ("02 Januar 2026" zu "2026-01-02")
4. Upsert in die Datenbank (Duplikate ignorieren)
5. Erfolgsmeldung mit Anzahl neuer/aktualisierter Eintraege

## Neue Dateien

- `src/pages/app/training/TrainingPage.tsx` -- Hauptseite mit Upload + Dashboard
- `src/components/training/TrainingKPICards.tsx` -- KPI-Leiste oben
- `src/components/training/WeeklyVisitsChart.tsx` -- Besuche pro Woche
- `src/components/training/TimeDistributionChart.tsx` -- Uhrzeiten-Verteilung
- `src/components/training/WeekdayHeatmap.tsx` -- Wochentags-Heatmap
- `src/components/training/MonthlyComparisonChart.tsx` -- Monatsvergleich
- `src/components/training/TrainingCalendar.tsx` -- Kalender mit Streak
- `src/components/training/CsvUploader.tsx` -- Upload-Komponente
- `src/hooks/useTrainingCheckins.ts` -- Daten laden + CSV-Import-Mutation
- `src/lib/training/csvParser.ts` -- CSV-Parsing mit deutschem Datumsformat
- `src/lib/training/types.ts` -- TypeScript-Typen
- `src/lib/training/analytics.ts` -- Berechnungen (Streaks, Buckets, Aggregationen)

## Bestehende Aenderungen

- **`src/App.tsx`**: Neue Route `/app/training` einhaengen
- **`src/components/layout/AppLayout.tsx`**: Neuer Nav-Link "Training" mit Dumbbell-Icon
- **Migration**: Tabelle `training_checkins` + RLS-Policies + Unique-Constraint

## Technologie

- **Recharts** (bereits installiert) fuer alle Charts
- **date-fns** (bereits installiert) fuer Datumsberechnungen
- Kein neues Package noetig

