
# Forecast-Snapshots: Prognosen speichern und als Overlay anzeigen

## Konzept

Jedes Mal wenn du einen neuen Gewichtseintrag speicherst, wird die **aktuelle Prognose automatisch als Snapshot gespeichert**. Spaeter kannst du per Toggle-Button ("Alte Prognosen") diese gespeicherten Prognoselinien als halbtransparente Overlay-Linien im Chart anzeigen -- so siehst du direkt, wie genau deine frueheren Prognosen waren im Vergleich zu dem was tatsaechlich passiert ist.

## Neues Datenbank-Schema

Eine neue Tabelle `weight_forecast_snapshots`:

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid | Primary Key |
| user_id | uuid | Dein User |
| created_at | timestamptz | Wann gespeichert |
| snapshot_date | text | Datum an dem die Prognose erstellt wurde (YYYY-MM-DD) |
| forecast_days | integer | 14 oder 30 |
| daily_swing | numeric | Tagesschwankung zum Zeitpunkt |
| points_json | jsonb | Array der Prognose-Punkte `[{date, value, simulated, lower, upper}]` |

RLS: Nur eigene Snapshots lesen/schreiben/loeschen.

## Ablauf

```text
Neuer Gewichtseintrag
       |
       v
  upsert weight_entry
       |
       v
  forecast(entries, 14) berechnen
  forecast(entries, 30) berechnen
       |
       v
  Beide als Snapshot in DB speichern
  (alte Snapshots vom selben Tag ueberschreiben)
```

## UI-Aenderungen

### Neuer Toggle-Button im Chart-Header

Ein neuer Badge-Button **"Alte Prognosen"** (mit einem History-Icon) wird neben den bestehenden Trend-Buttons platziert. Bei Klick:
- Laedt die letzten 5-10 Snapshots aus der DB
- Zeigt jede gespeicherte Prognose als duenne, halbtransparente Linie im Chart
- Jede Linie bekommt ein leicht unterschiedliches Opacity-Level (aeltere = blasser)
- Im Tooltip wird bei Hover auf eine Overlay-Linie angezeigt: "Prognose vom [Datum]: X kg"

### Visuelles Design

- Overlay-Linien: gleiche Farbe wie Forecast (lila), aber mit abnehmender Opacity (neueste: 40%, aelteste: 15%)
- Gestrichelt wie die aktuelle Prognose
- Kein Konfidenzband fuer alte Prognosen (wuerde zu unuebersichtlich)
- Nur die Trend-Linie (value), nicht die simulierte Oszillation

## Technische Aenderungen

### 1. Datenbank-Migration

Neue Tabelle `weight_forecast_snapshots` mit RLS-Policies fuer eigene Daten.

### 2. `src/hooks/useWeightEntries.ts`

- Nach erfolgreichem `upsert` eines Gewichtseintrags: aktuelle 14d und 30d Forecasts berechnen und als Snapshots speichern
- Dabei `forecast()` aus `analytics.ts` aufrufen mit den aktuellen Entries

### 3. Neuer Hook `src/hooks/useForecastSnapshots.ts`

- Laedt die letzten 10 Snapshots des Users
- Gibt sie als Array zurueck, sortiert nach Erstelldatum
- Optional: Filter nach forecast_days (14 oder 30)

### 4. `src/components/weight/WeightTerrainChart.tsx`

- Neuer TrendKey: `'history'`
- Neuer Badge-Button "Alte Prognosen"
- Wenn aktiv: Snapshots laden und als zusaetzliche `<Line>` Elemente rendern
- Jeder Snapshot wird in chartData gemappt (Punkte die in den sichtbaren Datumsbereich fallen)
- Tooltip erweitern: wenn ein historischer Forecast-Punkt gehovert wird, Datum der Prognose anzeigen

### 5. `src/pages/app/training/WeightPage.tsx`

- Forecast-Snapshot-Logik in den Save-Handler integrieren (nach erfolgreichem Gewichtseintrag)

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| Migration SQL | Neue Tabelle `weight_forecast_snapshots` |
| `src/hooks/useWeightEntries.ts` | Snapshot-Speicherung nach upsert |
| `src/hooks/useForecastSnapshots.ts` | Neuer Hook zum Laden der Snapshots |
| `src/components/weight/WeightTerrainChart.tsx` | Overlay-Linien rendern, neuer Toggle |
| `src/pages/app/training/WeightPage.tsx` | Snapshots an Chart weitergeben |
| `src/lib/weight/types.ts` | Typ fuer ForecastSnapshot |
