
# Homogenes Gewichts- und Koerperanalyse-System

## Problem

Aktuell gibt es zwei getrennte Systeme auf der Gewichts-Seite:
1. **Manuelles Gewichts-Tracking** (`weight_entries`) -- mit eigenem Input, KPIs, TerrainChart, Heatmap, Monatsuebersicht, Eintragsliste
2. **Smart Scale Dashboard** (`smart_scale_entries`) -- mit eigenem KPI-Strip und 4 Chart-Karten, unter einer separaten "Smart Scale" Ueberschrift

Das fuehlt sich wie zwei zusammengeklebte Apps an. Das Ziel: ein einheitliches, stimmiges System.

## Design-Prinzipien

1. **Eine Gewichtszeitlinie**: Manuelle Eintraege UND Smart-Scale-Gewichtsdaten fliessen in EINEN gemeinsamen Gewichtsverlauf zusammen
2. **Tabs statt vertikaler Trennung**: Verschiedene Analyse-Bereiche (Gewicht, Koerperzusammensetzung, Herz, Fett, Stoffwechsel) als horizontale Tabs -- nicht alles untereinander
3. **Konsistente KPI-Cards**: Alle Bereiche nutzen das gleiche Card-Design (das ausfuehrlichere mit Info-Popover aus WeightKPICards)
4. **Konsistente Charts**: Alle Charts nutzen CardHeader/CardTitle + gleiche Hoehe (280px) + gleiche Achsen-Styles
5. **Daten die es nicht gab**: Tabs fuer neue Metriken (Herz, Fett, Stoffwechsel) erscheinen nur wenn Smart-Scale-Daten vorhanden sind

## Neues Seiten-Layout

```text
+------------------------------------------------------------------+
| Training  [Check-ins] [Body Scan] [Gewicht]    [Waage importieren]|
+------------------------------------------------------------------+
| [Gewicht eintragen: _____ kg] [Speichern]                        |
+------------------------------------------------------------------+
| [Uebersicht] [Koerper] [Herz] [Fett] [Stoffwechsel]             |
+------------------------------------------------------------------+
|                                                                   |
|  (Inhalt je nach aktivem Tab)                                     |
|                                                                   |
+------------------------------------------------------------------+
```

## Tab-Struktur

### Tab 1: "Uebersicht" (Standard)
Vereint alte + neue Gewichtsdaten zu einem Gesamtbild:

- **Unified KPI Cards** (6 Karten): Aktuelles Gewicht, Trend (7d MA), Volatilitaet, Tiefstwert, Hoechstwert, Monatsdurchschnitt
  - Datenquelle: Kombination aus `weight_entries` + `smart_scale_entries.weight_kg`
  - Beide Quellen werden zu einer einheitlichen Gewichts-Zeitlinie zusammengefuehrt (bei Ueberschneidung am selben Tag: Smart-Scale-Tagesdurchschnitt bevorzugt, da praeziser)
- **Gewichtsverlauf (TerrainChart)**: Unveraendert, aber mit Smart-Scale-Gewichtspunkten als zusaetzliche Dots
- **Tagesvergleich** (Morgen vs Abend): Wenn Smart-Scale-Daten vorhanden
- **Monats-Bar + Heatmap**: Wie bisher, aber mit kombinierten Daten
- **Eintragsliste**: Chronologisch, zeigt sowohl manuelle als auch Smart-Scale-Eintraege mit Quell-Icon (Stift vs Waage-Icon)

### Tab 2: "Koerper" (nur sichtbar wenn Smart-Scale-Daten vorhanden)
- KPI-Cards: Koerperfett %, Muskelmasse kg, Skelettmuskel %, Wasser %, Protein %, BMI
  - Gleiches Design wie Gewichts-KPIs (mit Info-Popover fuer Berechnungserklaerung)
- Koerperzusammensetzung Stacked-Area-Chart (unveraendert, aber mit konsistentem Card-Layout)

### Tab 3: "Herz" (nur sichtbar wenn Smart-Scale-Daten mit HR vorhanden)
- KPI-Cards: Herzfrequenz (bpm), Herzindex (L/Min/M2), Ruhezone-Bewertung
- Herz-Kreislauf Dual-Axis Chart (unveraendert, konsistentes Layout)

### Tab 4: "Fett" (nur sichtbar wenn Smart-Scale-Daten vorhanden)
- KPI-Cards: Viszeralfett (Rating + Zone), Unterhautfett %, Koerperfett %
- Fettverteilung Chart mit Referenz-Zonen (unveraendert, konsistentes Layout)

### Tab 5: "Stoffwechsel" (nur sichtbar wenn Smart-Scale-Daten vorhanden)
- KPI-Cards: Grundumsatz kcal, Koerperalter vs echtes Alter
- Stoffwechsel Chart (unveraendert, konsistentes Layout)

## Technische Umsetzung

### 1. Unified Weight Timeline (Neue Hilfsfunktion)

Neue Datei `src/lib/weight/unifiedTimeline.ts`:
- Funktion `mergeWeightSources(manualEntries, scaleEntries)` die beide Quellen zu einer einheitlichen `WeightEntry[]`-Liste zusammenfuehrt
- Smart-Scale-Eintraege werden zu Tagesdurchschnitten aggregiert
- Bei Ueberschneidung: Smart-Scale-Wert hat Vorrang (genauer gemessen)
- Jeder Eintrag bekommt ein `source: 'manual' | 'scale'` Flag

### 2. WeightPage.tsx -- Komplett-Umbau

- Tabs mit Radix-UI Tabs-Komponente (bereits im Projekt verfuegbar)
- State: `activeTab` (default: 'overview')
- Dynamische Tab-Liste: "Uebersicht" immer sichtbar, andere nur wenn `scaleEntries.length > 0`
- Unified entries berechnen und an Kind-Komponenten weiterreichen

### 3. KPI-Cards vereinheitlichen

- `ScaleKPIStrip.tsx` wird refactored zum selben Design wie `WeightKPICards`:
  - Card mit Popover-Info-Button
  - Icon + Label + Wert + Sub-Text
  - Trend-Farben konsistent (gruen = gut, rot = schlecht, kontextabhaengig)
- Neue gemeinsame KPI-Card-Komponente `src/components/weight/KPICard.tsx` die von allen Tabs genutzt wird

### 4. Chart-Karten vereinheitlichen

- Alle Smart-Scale-Charts bekommen `CardHeader` + `CardTitle` (wie TerrainChart)
- Gleiche Hoehe: 280px fuer Tab-interne Charts
- TerrainChart bleibt bei 420px (Hauptchart)
- Konsistentes Tooltip-Styling

### 5. Eintragsliste erweitern

- `WeightEntryList` erhaelt eine `source`-Spalte mit Icon
- Smart-Scale-Eintraege zeigen Uhrzeit praeziser und sind nicht editierbar (kommen vom Import)
- Manuelle Eintraege bleiben editier- und loeschbar

## Dateien und Aenderungen

| Datei | Aenderung |
|-------|-----------|
| **Neue Dateien** | |
| `src/lib/weight/unifiedTimeline.ts` | Merge-Funktion fuer manuelle + Scale-Gewichtsdaten |
| `src/components/weight/KPICard.tsx` | Wiederverwendbare KPI-Card mit Info-Popover |
| `src/components/weight/WeightTabs.tsx` | Tab-Container mit dynamischer Tab-Liste |
| **Bestehende Dateien** | |
| `src/pages/app/training/WeightPage.tsx` | Komplett-Umbau: Tabs-Layout, unified entries, dynamische Tab-Sichtbarkeit |
| `src/components/weight/WeightKPICards.tsx` | Refactor: Nutzt neue KPICard-Komponente, akzeptiert unified entries |
| `src/components/weight/WeightEntryList.tsx` | Neue `source`-Spalte, Scale-Eintraege nicht editierbar |
| `src/components/weight/WeightTerrainChart.tsx` | Zusaetzliche Scale-Gewichtspunkte als Overlay-Dots |
| `src/components/weight/WeightHeatmapStrip.tsx` | Unified entries verwenden |
| `src/components/weight/MonthSummaryBar.tsx` | Unified entries verwenden |
| `src/components/smartscale/ScaleKPIStrip.tsx` | Refactor zum KPICard-Design mit Info-Popovers |
| `src/components/smartscale/BodyCompositionChart.tsx` | CardHeader/CardTitle konsistent |
| `src/components/smartscale/HeartHealthChart.tsx` | CardHeader/CardTitle konsistent, KPIs als separate Cards oberhalb |
| `src/components/smartscale/VisceralFatChart.tsx` | CardHeader/CardTitle konsistent, KPIs als separate Cards oberhalb |
| `src/components/smartscale/MetabolismChart.tsx` | CardHeader/CardTitle konsistent, KPIs als separate Cards oberhalb |
| `src/components/smartscale/DailyComparisonCard.tsx` | Ins Uebersicht-Tab verschoben |

## Reihenfolge

1. `KPICard.tsx` -- Wiederverwendbare Basiskomponente
2. `unifiedTimeline.ts` -- Daten-Merge-Logik
3. `WeightTabs.tsx` -- Tab-Container
4. `WeightPage.tsx` -- Neues Layout mit Tabs
5. KPI-Refactoring (alle KPI-Strips nutzen KPICard)
6. Chart-Styling-Vereinheitlichung
7. WeightEntryList Erweiterung
8. TerrainChart + Heatmap + MonthBar auf unified entries umstellen
