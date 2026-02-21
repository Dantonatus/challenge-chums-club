

# Fix: Koerperzusammensetzung -- fachlich korrekte Darstellung

## Problem

Der aktuelle Stacked Area Chart addiert vier Prozentwerte, die sich gegenseitig ueberlappen:

- **Koerperwasser (57%)** -- verteilt sich auf Muskeln, Organe, Blut, Haut
- **Skelettmuskel (51%)** -- enthaelt Wasser und Protein
- **Protein (18%)** -- ist Bestandteil der Muskelmasse
- **Koerperfett (21%)** -- relativ eigenstaendig, enthaelt aber auch etwas Wasser

Summe = ~147%. Ein Stacked Chart suggeriert, dass die Werte zusammen 100% ergeben -- das ist falsch.

## Fachlicher Hintergrund (Bioimpedanzanalyse)

Bei BIA-Waagen wie der Starfit gibt es zwei sinnvolle Betrachtungsebenen:

### 1. Koerpermasse-Aufteilung (kg, addiert sich zum Koerpergewicht)

```text
Koerpergewicht (94.15 kg)
  = Fettmasse  +  Muskelmasse  +  Knochenmasse  +  Rest (Organe, Blut)
  = ~19.6 kg   +  70.88 kg     +  3.73 kg       +  ~0 kg
```

Diese Werte sind nicht-ueberlappend und summieren sich zum Gesamtgewicht.

### 2. Unabhaengige Prozentwerte (jeweils eigene Skala)

Fett%, Muskel%, Wasser%, Protein% sind eigenstaendige Metriken mit eigenen Referenzbereichen. Sie duerfen nebeneinander, aber NICHT gestapelt dargestellt werden.

## Loesung

Den BodyCompositionChart in zwei Darstellungen aufteilen:

### A. Koerpermasse-Aufteilung (Stacked Bar / Stacked Area -- in kg)

Nicht-ueberlappende Komponenten des Koerpergewichts:

| Komponente | Berechnung | Beispiel |
|------------|------------|----------|
| Fettmasse | weight_kg * fat_percent / 100 | 19.58 kg |
| Muskelmasse | muscle_mass_kg (direkt) | 70.88 kg |
| Knochenmasse | bone_mass_kg (direkt) | 3.73 kg |

Diese drei summieren sich (naeherungsweise) zum Koerpergewicht und duerfen gestapelt werden.

### B. Prozentwerte als Linien-Chart (nicht gestapelt)

Jede Metrik als eigene Linie mit eigenem Referenzbereich:

| Metrik | Referenz (Maenner) | Farbe |
|--------|-------------------|-------|
| Koerperfett % | 10-20% (gesund) | Rot |
| Skelettmuskel % | 40-60% | Blau/Primary |
| Koerperwasser % | 50-65% | Cyan |
| Protein % | 16-20% | Gelb/Amber |

Referenzbereiche werden als halbtransparente horizontale Baender hinterlegt, damit der Nutzer sofort sieht, ob er im gesunden Bereich liegt.

## Technische Umsetzung

### Datei: `src/components/smartscale/BodyCompositionChart.tsx`

Kompletter Umbau der Komponente:

1. **Oberer Chart**: Stacked Area (kg) mit drei Flaechen: Fett, Muskel, Knochen
   - Daten: `fat_kg = weight_kg * fat_percent / 100`, `muscle_mass_kg`, `bone_mass_kg`
   - Y-Achse: kg
   - Titel: "Koerpermasse-Aufteilung (kg)"

2. **Unterer Chart**: Multi-Line Chart (%) mit vier Linien
   - Daten: `fat_percent`, `skeletal_muscle_percent`, `body_water_percent`, `protein_percent`
   - Y-Achse: % (0-70 Bereich)
   - Referenzbaender als `ReferenceArea` Komponenten
   - Titel: "Koerperanalyse-Metriken (%)"
   - Legende mit Metrik-Namen

### Datei: `src/lib/smartscale/analytics.ts`

Neue Hilfsfunktion:

- `dailyMassBreakdown(entries)`: Berechnet pro Tag die Fettmasse (weight * fat% / 100), Muskelmasse und Knochenmasse als Tagesdurchschnitte

Keine weiteren Dateien betroffen.
