

# Mehrfachmessungen pro Tag: Analytisch korrekte Darstellung

## Ausgangslage

Die Datenbank zeigt, dass es regelmaessig mehrere Messungen pro Tag gibt (bis zu 4), zu unterschiedlichen Tageszeiten:
- 20. Feb: 08:17, 22:33, 23:16 (3 Messungen)
- 18. Feb: 01:08, 09:03, 22:16, 22:21 (4 Messungen)
- 17. Feb: 10:14, 14:32 (2 Messungen)

## Fachlicher Hintergrund

BIA-Messungen (Bioimpedanzanalyse) variieren stark je nach Tageszeit:
- **Morgens nuechtern**: Niedrigstes Gewicht, hoechster Koerperfettanteil (weniger Wasser), niedrigster Wasseranteil. Dies ist der Goldstandard fuer Vergleichbarkeit.
- **Abends**: Hoeheres Gewicht (Nahrung, Wasser), niedrigerer relativer Fettanteil, hoeherer Wasseranteil.
- **Differenz**: 0.5-2 kg Gewicht, 1-3% Fett sind normal.

Einfach den Tagesdurchschnitt zu nehmen (aktueller Ansatz) verwischt diese systematische Variation und erzeugt inkonsistente Trends.

## Loesung: Tageszeit-Filter + Punktwolke

### 1. Globaler Tageszeit-Filter (Segment Control)

Ein Toggle-Control auf Tab-Ebene mit drei Optionen:

| Option | Zeitfenster | Nutzen |
|--------|-------------|--------|
| Morgens | 04:00 - 11:59 | Vergleichbarste Werte (nuechtern, ausgeruht) |
| Abends | 17:00 - 03:59 | Sehen wie sich der Tag auswirkt |
| Alle | 00:00 - 23:59 | Gesamtbild mit Streuung |

Default: **Morgens** (wissenschaftlich empfohlen)

### 2. Charts: Einzelpunkte + Trendlinie

Statt nur Tagesdurchschnitte zu zeigen:
- **Punkte (Dots)**: Jede einzelne Messung als kleiner Punkt (Transparenz 50%)
- **Linie**: Tagesdurchschnitt der gefilterten Messungen als dickere Verbindungslinie
- So sieht man sofort die Streuung innerhalb eines Tages

### 3. Betroffene Komponenten

Alle Smart-Scale-Charts nutzen `dailyAverages()` aus analytics.ts. Der Filter wird dort angesetzt:

| Komponente | Aenderung |
|------------|-----------|
| `WeightPage.tsx` | State fuer Tageszeit-Filter + Toggle-UI |
| `analytics.ts` | Neue Funktion `filterByTimeOfDay(entries, slot)` |
| `BodyCompositionChart.tsx` | Empfaengt gefilterte Entries |
| `HeartHealthChart.tsx` | Empfaengt gefilterte Entries |
| `VisceralFatChart.tsx` | Empfaengt gefilterte Entries |
| `MetabolismChart.tsx` | Empfaengt gefilterte Entries |
| `ScaleKPIStrip.tsx` | KPI-Werte basierend auf gefiltertem Zeitfenster |
| `DailyComparisonCard.tsx` | Bleibt unveraendert (zeigt explizit Morgen vs Abend) |

## Technische Umsetzung

### A. Neue Filterfunktion in `analytics.ts`

```text
type TimeSlot = 'morning' | 'evening' | 'all';

filterByTimeOfDay(entries, slot):
  morning: 04:00 - 11:59
  evening: 17:00 - 03:59 (naechster Tag)
  all: keine Filterung
```

### B. Toggle-UI in `WeightPage.tsx`

Innerhalb des Tabs-Bereichs, oberhalb der Tab-Inhalte:
- Drei Segmente: Morgens / Abends / Alle
- Icon: Sun, Moon, Clock
- Kompakter Style, konsistent mit bestehendem Design
- State wird an alle Scale-Komponenten als `filteredScaleEntries` weitergereicht

### C. Chart-Anpassung (alle 4 Charts)

Die Charts erhalten bereits gefilterte Entries. Keine interne Aenderung noetig ausser dass `HeartHealthChart` bereits Einzelpunkte zeigt (gut so). Die anderen Charts nutzen `dailyAverages` auf den gefilterten Daten -- das ist korrekt, weil nach Filterung z.B. nur noch Morgen-Messungen uebrig sind.

### D. Punkt-Wolke fuer "Alle"-Modus

Im "Alle"-Modus werden Charts um eine Scatter-Schicht ergaenzt:
- Kleine transparente Punkte fuer jede Einzelmessung
- Dickere Linie fuer den Tagesdurchschnitt
- So wird die Tagesvariation sichtbar

## Ergebnis

- Nutzer waehlt "Morgens" (Default) und sieht konsistente, vergleichbare Trends
- Nutzer waehlt "Abends" und sieht wie sich Ernaehrung/Hydration auswirkt
- Nutzer waehlt "Alle" und sieht die volle Streuung mit Einzelpunkten
- Die DailyComparisonCard zeigt weiterhin den direkten Morgen/Abend-Vergleich

