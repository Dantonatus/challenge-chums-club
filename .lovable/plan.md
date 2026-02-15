

# Gewichtstracker -- Neuer Tab "Gewicht"

## Uebersicht

Dritter Reiter neben "Check-ins" und "Body Scan" im Training-Bereich. Einfaches Eingabefeld fuer taegliche Gewichtseingaben mit automatischer Datums-/Uhrzeiterfassung, plus eine innovative Verlaufsansicht mit Analysen.

## Datenbank

Neue Tabelle `weight_entries`:

```text
id           uuid PK DEFAULT gen_random_uuid()
user_id      uuid NOT NULL
date         text NOT NULL (YYYY-MM-DD)
time         text NOT NULL (HH:MM)
weight_kg    numeric NOT NULL
created_at   timestamptz DEFAULT now()
UNIQUE(user_id, date)
```

RLS: Users can CRUD own entries (identisch zu body_scans).

Die mitgelieferten historischen Daten (54 Eintraege, Sep 2025 - Feb 2026) werden beim ersten Import ueber eine Seed-Funktion eingefuegt.

## Eingabefeld

- Prominentes, grosses Eingabefeld oben auf der Seite
- Vorausgefuelltes Datum (heute) und Uhrzeit (jetzt)
- Letzter Wert als Platzhalter angezeigt
- "Speichern" per Enter oder Button
- Sofortige Animation beim Eintrag (Zahl faehrt in den Chart)
- Upsert-Logik: gleiches Datum ueberschreibt den bestehenden Wert

## Innovative Verlaufsansicht

### "Mountain Range" Visualisierung

Statt eines normalen Linien-Charts wird das Gewicht als lebendige Berglandschaft dargestellt:

1. **Haupt-Ansicht: Gradient-Terrain-Chart**
   - Area-Chart mit dynamischem Farbverlauf: Gruen (Tiefpunkte/Ziele) zu Rot (Hochpunkte)
   - Der Gradient passt sich dynamisch an Min/Max an
   - Animierte Partikel fliessen entlang der Linie
   - Aktueller Punkt pulsiert als leuchtender Dot

2. **Gleitender Durchschnitt als "Pfad"**
   - 7-Tage gleitender Durchschnitt als gestrichelte Linie ueberlagert
   - Zeigt den wahren Trend ohne Tagesschwankungen

3. **Zielbereich-Band**
   - Halbtransparentes Band zeigt den Zielbereich
   - Berechnet sich automatisch oder wird manuell gesetzt

4. **Interaktive Zeitraum-Segmente**
   - Klickbare Monats-Segmente am unteren Rand
   - Jeder Monat zeigt Durchschnitt, Min, Max als kompakte Zusammenfassung
   - Smooth-Zoom beim Klick auf einen Monat

### Analyse-Karten

| Karte | Inhalt |
|---|---|
| Aktuelles Gewicht | Letzter Eintrag + Differenz zur Vorwoche |
| Trend | 7-Tage-Durchschnitt + Pfeil hoch/runter/stabil |
| Volatilitaet | Standardabweichung der letzten 14 Tage (wie stabil?) |
| Tiefster Wert | All-Time-Low mit Datum |
| Hoechster Wert | All-Time-High mit Datum |
| Monatlicher Schnitt | Aktueller Monat vs. Vormonat |

### Wochen-Heatmap-Streifen

- Horizontaler Streifen, jeder Block = 1 Tag
- Farbe zeigt Abweichung vom Durchschnitt: dunkler = weiter weg
- Luecken (keine Messung) werden als leere Bloecke dargestellt
- Hover zeigt exakten Wert

## Technische Umsetzung

### Neue Dateien

| Datei | Zweck |
|---|---|
| `src/lib/weight/types.ts` | WeightEntry Interface |
| `src/lib/weight/analytics.ts` | Gleitender Durchschnitt, Trends, Statistiken |
| `src/hooks/useWeightEntries.ts` | Query + Upsert-Mutation |
| `src/pages/app/training/WeightPage.tsx` | Haupt-Page mit Eingabe + Visualisierungen |
| `src/components/weight/WeightInput.tsx` | Eingabefeld-Komponente |
| `src/components/weight/WeightTerrainChart.tsx` | Haupt-Chart mit Gradient + Durchschnitt |
| `src/components/weight/WeightKPICards.tsx` | 6 Analyse-Karten |
| `src/components/weight/WeightHeatmapStrip.tsx` | Wochen-Heatmap |
| `src/components/weight/MonthSummaryBar.tsx` | Klickbare Monats-Segmente |

### Bestehende Dateien aendern

| Datei | Aenderung |
|---|---|
| `src/App.tsx` | Route `/app/training/weight` hinzufuegen |
| `src/pages/app/training/TrainingPage.tsx` | Dritten Tab "Gewicht" mit Scale-Icon hinzufuegen |
| `src/pages/app/training/BodyScanPage.tsx` | Dritten Tab "Gewicht" mit Scale-Icon hinzufuegen |

### Tab-Toggle Erweiterung

Alle drei Seiten (TrainingPage, BodyScanPage, WeightPage) zeigen denselben 3er-Toggle:
- Check-ins (`/app/training`)
- Body Scan (`/app/training/bodyscan`)
- Gewicht (`/app/training/weight`)

Der aktive Tab wird ueber `location.pathname` bestimmt.

### Daten-Import

Die historischen Gewichtsdaten aus dem Chat werden als initiale Seed-Daten eingefuegt, sodass sofort ein Verlauf sichtbar ist.

