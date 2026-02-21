

# Fix: Daten-Aktualisierung nach Smart-Scale-Import

## Probleme

1. **Alte Daten in der Datenbank**: Die aktuell gespeicherten Eintraege stammen vom Import VOR dem Parser-Fix -- alle Werte ausser BMI und Bauchfett sind `null`. Der Parser ist jetzt korrekt, aber die Daten muessen durch erneuten Import ueberschrieben werden.

2. **Keine automatische Aktualisierung**: Nach einem erfolgreichen Smart-Scale-Import wird nur die Query `smart-scale-entries` invalidiert. Die Gewichts-Queries (`weight-entries`, `forecast-snapshots`) werden NICHT invalidiert, obwohl die unified Timeline beide Quellen zusammenfuehrt. Dadurch aktualisieren sich WeightTerrainChart, KPIs, Heatmap und MonthSummary nicht.

## Loesung

### 1. Cache-Invalidierung erweitern

In `src/hooks/useSmartScaleEntries.ts` muss `bulkImport.onSuccess` zusaetzlich die weight-bezogenen Queries invalidieren:

```text
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['smart-scale-entries'] });
  queryClient.invalidateQueries({ queryKey: ['weight-entries'] });      // NEU
  queryClient.invalidateQueries({ queryKey: ['forecast-snapshots'] });  // NEU
}
```

Dasselbe fuer `remove.onSuccess`, damit auch nach dem Loeschen eines Scale-Eintrags die unified Timeline aktualisiert wird.

### 2. Alte null-Daten loeschen

Die aktuell in der DB gespeicherten Eintraege mit `weight_kg = null` sind nutzlos. Per SQL-Migration werden diese bereinigt, damit der erneute Import sauber funktioniert:

```sql
DELETE FROM smart_scale_entries WHERE weight_kg IS NULL;
```

### 3. Datei automatisch verarbeiten

Die hochgeladene Datei `Starfit-Dante-3.csv` wird ins Projekt kopiert, damit der Nutzer sie direkt importieren kann. Der Parser und Uploader sind bereit -- nach dem Fix wird ein Import alle Daten korrekt in die unified Timeline einspeisen.

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useSmartScaleEntries.ts` | `bulkImport.onSuccess` und `remove.onSuccess`: zusaetzliche Invalidierung von `weight-entries` und `forecast-snapshots` |
| DB | Bereinigung der alten null-Eintraege per SQL |

## Ergebnis nach dem Fix

1. Nutzer importiert die Datei ueber "Waage importieren"
2. Parser erkennt alle 15 Metriken korrekt (toNum streift Einheiten ab)
3. Daten werden per UPSERT in die DB geschrieben
4. onSuccess invalidiert ALLE relevanten Queries
5. Unified Timeline berechnet sich neu (manuell + Scale)
6. WeightTerrainChart, KPIs, Heatmap, MonthSummary, Eintragsliste -- alles aktualisiert sich automatisch
7. Koerper/Herz/Fett/Stoffwechsel-Tabs erscheinen mit Daten

