

# Prognose 60 Tage hinzufuegen

## Was wird geaendert

Ein neuer **Prognose 60d** Button wird neben den bestehenden Prognose-Buttons (14d, 30d) ergaenzt. Gleiche Methode (Holt-Winters), nur mit 60 Tagen Horizont und entsprechend breiterem Konfidenzband.

## Aenderungen

### Datei: `src/components/weight/WeightTerrainChart.tsx`

1. **TrendKey-Typ** erweitern: `'forecast60'` hinzufuegen
2. **TREND_CONFIG** um `forecast60` ergaenzen mit Label "Prognose 60d", gleicher Farbe, und angepasstem Beschreibungstext (laengerer Horizont, breiteres Konfidenzband)
3. **Forecast-Daten** berechnen: `forecast60Data = forecast(entries, 60)` als neues `useMemo`
4. **Toggle-Logik** anpassen: Die `toggleTrend`-Funktion behandelt aktuell nur `forecast14` und `forecast30` als gegenseitig exklusiv. Das wird auf alle drei Forecast-Keys (`forecast14`, `forecast30`, `forecast60`) erweitert -- nur einer kann gleichzeitig aktiv sein
5. **activeForecastKey** Logik erweitern: `forecast60` als dritte Option in die Kette aufnehmen
6. **activeForecastDays** Mapping: `forecast60` auf 60 mappen
7. **Snapshot-Speicherung** (in `useWeightEntries.ts`): Beim Upsert auch einen 60-Tage-Snapshot speichern, damit "Alte Prognosen" auch fuer 60d funktioniert

### Datei: `src/hooks/useWeightEntries.ts`

8. In der `upsert`-Mutation den Loop `[14, fc14], [30, fc30]` um `[60, fc60]` erweitern, damit bei jedem neuen Eintrag auch ein 60-Tage-Forecast-Snapshot gespeichert wird

Keine Datenbank-Aenderung noetig -- die `weight_forecast_snapshots` Tabelle speichert `forecast_days` bereits als Zahl.

