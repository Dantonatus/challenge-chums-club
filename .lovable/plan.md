

# Erweiterte Training-Visualisierungen

## 1. Bubble-Heatmap: Wochentag x Uhrzeit

Eine Matrix-Darstellung mit Wochentagen (Mo-So) auf der Y-Achse und Zeitslots (30-Minuten-Raster, z.B. 06:00, 06:30, 07:00, ..., 22:00) auf der X-Achse. Jede Zelle zeigt eine Bubble, deren Groesse proportional zur Anzahl der Check-ins in diesem Slot ist. Leere Zellen bleiben leer.

**Technisch:**
- Neue Analyse-Funktion `bubbleHeatmapData(checkins)` in `analytics.ts`: Jede Check-in-Zeit wird auf den naechsten 30-Min-Slot gerundet (z.B. 19:26 wird zu 19:30). Ergebnis ist ein Array `{ day: 'Mo'|..., slot: '19:30', count: number }`.
- Neue Komponente `src/components/training/TimeBubbleHeatmap.tsx`: Komplett custom mit CSS-Grid oder SVG gerendert (kein Recharts noetig). Bubbles als `div`-Kreise mit `width/height` skaliert nach Count. Farbintensitaet zusaetzlich abgestuft (heller = weniger, kraeftiger = mehr).
- Tooltip beim Hover ueber eine Bubble zeigt exakte Anzahl und Zeitfenster.

## 2. Weitere neue Auswertungen

### a) Trainingsfrequenz-Trend (Linienchart)
Gleitender Durchschnitt der Besuche pro Woche ueber die gesamte Zeitspanne. Zeigt ob die Frequenz steigt oder sinkt.
- Neue Funktion `rollingAvgWeekly(checkins, windowSize=4)` in `analytics.ts`
- Neue Komponente `src/components/training/FrequencyTrendChart.tsx`

### b) Ruhetage-Analyse
Wie viele Tage Pause liegen typischerweise zwischen zwei Trainings? Verteilung als Balkendiagramm (X: "1 Tag Pause", "2 Tage Pause", ...; Y: Haeufigkeit).
- Neue Funktion `restDayDistribution(checkins)` in `analytics.ts`
- Neue Komponente `src/components/training/RestDaysChart.tsx`

### c) Persoenliche Rekorde / Fun Facts
Eine Karte mit interessanten Datenpunkten:
- Fruehester Check-in (z.B. "05:42 am 12. Jan")
- Spaetester Check-in
- Aktivster Tag (meiste Check-ins an einem Tag, falls Doppelbesuche vorkommen)
- Laengste Trainingspause
- Neue Komponente `src/components/training/PersonalRecords.tsx`

## 3. Aenderungen an bestehenden Dateien

- **`src/lib/training/analytics.ts`**: Drei neue Funktionen (`bubbleHeatmapData`, `rollingAvgWeekly`, `restDayDistribution`, `personalRecords`)
- **`src/pages/app/training/TrainingPage.tsx`**: Neue Komponenten einbinden -- Bubble-Heatmap prominent oben, Rest darunter

## 4. Betroffene Dateien (Zusammenfassung)

| Datei | Aenderung |
|---|---|
| `src/lib/training/analytics.ts` | 4 neue Funktionen |
| `src/components/training/TimeBubbleHeatmap.tsx` | Neu |
| `src/components/training/FrequencyTrendChart.tsx` | Neu |
| `src/components/training/RestDaysChart.tsx` | Neu |
| `src/components/training/PersonalRecords.tsx` | Neu |
| `src/pages/app/training/TrainingPage.tsx` | 4 neue Komponenten einbinden |

