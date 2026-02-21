

# Zeitraum-Navigation im Uebersicht-Tab

## Ueberblick

Der Uebersicht-Tab zeigt aktuell alle Daten auf einmal. Neu wird ein Zeitraum-Umschalter (Woche / Monat / Quartal) mit Vor-/Zurueck-Navigation eingefuehrt, sodass KPIs, Eintraege, Chart und Heatmap nur den gewaehlten Zeitraum zeigen.

## UI-Design

```text
  [  <  ]   KW 8 · 17.–23. Feb 2026   [  >  ]
         [ Woche | Monat | Quartal ]
```

- Obere Zeile: Pfeil-Buttons links/rechts, in der Mitte das aktuelle Zeitfenster-Label
- Untere Zeile: ToggleGroup mit drei Segmenten (Woche / Monat / Quartal)
- "Alle"-Option bleibt ueber die bestehende MonthSummaryBar erreichbar (wird weiterhin angezeigt)

## Filterlogik

| Modus | Berechnung | Label-Beispiel |
|-------|-----------|----------------|
| Woche | ISO-Woche (Mo-So), Offset in ganzen Wochen | KW 8 · 17.–23. Feb 2026 |
| Monat | 1. bis letzter Tag des Monats, Offset in Monaten | Februar 2026 |
| Quartal | 3-Monats-Bloecke (Jan-Mär, Apr-Jun, ...), Offset in Quartalen | Q1 2026 (Jan–Mär) |

Standardwert: **Woche** mit aktuellem Datum als Ausgangspunkt. Vor/Zurueck verschiebt den Offset um -1/+1. "Zurueck zum Heute" ist implizit (Offset 0 = aktuelle Periode).

## Betroffene Komponenten

### Neue Datei: `src/components/weight/PeriodNavigator.tsx`

Eigenstaendige Komponente mit:
- State: `mode` ('week' | 'month' | 'quarter'), `offset` (number, 0 = aktuelle Periode)
- Props: `onChange(startDate, endDate)` Callback
- Berechnet Start-/Enddatum basierend auf Modus + Offset
- Rendert ToggleGroup + Pfeil-Navigation + Label
- Nutzt bestehende `date-fns` Funktionen und `src/lib/date.ts` Hilfsfunktionen

### Aenderung: `src/pages/app/training/WeightPage.tsx`

- Neuer State: `periodStart` / `periodEnd` (Date | null)
- PeriodNavigator wird oberhalb der Overview-Inhalte eingebaut
- Alle Komponenten im Overview-Tab erhalten gefilterte Entries:
  - `WeightKPICards` -- entries gefiltert auf Zeitraum
  - `WeightEntryList` -- entries gefiltert auf Zeitraum
  - `WeightTerrainChart` -- entries gefiltert auf Zeitraum (ersetzt `selectedMonth`)
  - `WeightHeatmapStrip` -- entries gefiltert auf Zeitraum
  - `MonthSummaryBar` -- wird weiterhin mit allen Entries angezeigt (Quick-Jump)
  - `DailyComparisonCard` -- unveraendert (nutzt Scale-Daten)

### Aenderung: `src/lib/weight/analytics.ts`

- Neue Hilfsfunktion `filterByDateRange(entries, start, end)`: Filtert Entries auf einen Zeitraum

## Technische Details

- `PeriodNavigator` nutzt `startOfWeek`/`endOfWeek`, `startOfMonth`/`endOfMonth`, `startOfQuarter`/`endOfQuarter` aus date-fns
- Wochenstart ist Montag (weekStartsOn: 1), konsistent mit `src/lib/date.ts`
- `selectedMonth` State im WeightPage wird durch das neue `periodStart`/`periodEnd` ersetzt -- die MonthSummaryBar kann optional als Quick-Jump beibehalten werden und setzt dann den PeriodNavigator auf den entsprechenden Monat
- Pfeil-Buttons deaktiviert wenn keine Daten in der Richtung vorhanden (fruehester/spaetester Eintrag als Grenze)

