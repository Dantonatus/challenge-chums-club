

## Fix: Zeitfilter konsequent auf alle Berechnungen anwenden

### Analyse

Der Datenfluss in `WeightPage.tsx` wurde vollstaendig nachverfolgt:

- `unifiedEntries` = manuelle + Scale-Daten, gefiltert nach Tageszeit (Morgens/Abends/Alle) -- **korrekt**
- `periodEntries` = unifiedEntries gefiltert nach Zeitraum (Woche/Monat/etc.) -- **korrekt**
- `WeightKPICards entries={periodEntries}` -- KPIs nutzen bereits gefilterte Daten -- **korrekt**
- `WeightTerrainChart entries={periodEntries}` -- Regression, MA7, MA30, Forecast nutzen gefilterte Daten -- **korrekt**
- `WeightHeatmapStrip entries={periodEntries}` -- **korrekt**

### Bugs gefunden

**Bug 1: DailyComparisonCard ignoriert Zeitfilter**
Zeile 234: `<DailyComparisonCard entries={scaleEntries} />` verwendet die ungefilterten Scale-Daten. Muss `filteredScaleEntries` verwenden.

**Bug 2: Zeitfilter-Toggle nur bei Scale-Daten sichtbar**
Zeile 199: `{hasScaleData && (` -- Der Morgens/Abends/Alle-Toggle wird nur angezeigt wenn Scale-Daten vorhanden sind. Da auch manuelle Eintraege ein `time`-Feld haben, sollte der Toggle immer sichtbar sein, damit der Zeitfilter auf alle Berechnungen wirkt.

### Aenderungen

**Datei: `src/pages/app/training/WeightPage.tsx`**

1. Zeile 234: `entries={scaleEntries}` aendern zu `entries={filteredScaleEntries}`
2. Zeile 199: Bedingung `{hasScaleData && (` entfernen, damit der Toggle immer sichtbar ist (Schliessendes `)}` auf Zeile 220 ebenfalls anpassen)

### Ergebnis

- DailyComparisonCard zeigt nur Daten der gewaehlten Tageszeit
- Zeitfilter ist immer verfuegbar, auch ohne Scale-Import
- Alle Berechnungen (Regression, MA7, MA30, Volatilitaet, Forecast, KPIs) werden konsistent auf Basis der gefilterten Daten berechnet
