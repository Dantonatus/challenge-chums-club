

## Fix: PDF-Sektionen werden abgeschnitten

### Ursachen

**1. Schatten-Clipping (KPI-Cards, Entry List Border)**
Der Capture-Buffer `-m-3 p-3` ist zu knapp. Die `shadow-sm` der Cards und die `rounded-2xl border` der Entry-Liste ragen ueber den erfassten Bereich hinaus. Betrifft beide Seiten (Training + Gewicht).

**2. Scroll-Container schneidet Inhalte ab (Entry List)**
`WeightEntryList` hat `max-h-[320px] overflow-y-auto`. `toJpeg` erfasst nur den sichtbaren Viewport -- alles unterhalb des Scrollbereichs und der "Mehr anzeigen"-Button werden abgeschnitten.

### Loesung

**Datei 1: `src/pages/app/training/WeightPage.tsx`**

1. Capture-Buffer von `-m-3 p-3` auf `-m-5 p-5` erhoehen fuer alle Refs (kpiRef, entryListRef, comparisonRef, terrainRef, heatmapRef)
2. Im `handleExport`: Vor dem Capture der Entry-Liste temporaer den Scroll-Constraint entfernen:
   - Das scrollbare `div` innerhalb von `entryListRef` finden (`.max-h-\\[320px\\]`)
   - `maxHeight` und `overflow` temporaer auf `none`/`visible` setzen
   - Alle Eintraege sichtbar machen (visibleCount temporaer erhoehen -- nicht moeglich von aussen, also alternative Loesung)
   
   Da `visibleCount` ein interner State der `WeightEntryList` ist, wird stattdessen der Scroll-Container via DOM manipuliert:
   ```typescript
   // Vor Capture
   const scrollDiv = entryListRef.current?.querySelector('.overflow-y-auto');
   if (scrollDiv) {
     scrollDiv.style.maxHeight = 'none';
     scrollDiv.style.overflow = 'visible';
   }
   // Capture...
   // Nach Capture wiederherstellen
   if (scrollDiv) {
     scrollDiv.style.maxHeight = '';
     scrollDiv.style.overflow = '';
   }
   ```

3. Hinweis: Die "Mehr anzeigen" Pagination zeigt nur 30 Eintraege initial. Fuer den PDF-Export wird der Scroll-Container expandiert, sodass alle aktuell geladenen Eintraege sichtbar sind. Das ist ausreichend, da die Entry-Liste bereits alle `periodEntries` erhaelt.

**Datei 2: `src/pages/app/training/TrainingPage.tsx`**

1. Capture-Buffer von `-m-3 p-3` auf `-m-5 p-5` erhoehen fuer alle Refs
2. Pruefen ob dort aehnliche Scroll-Container existieren (TrainingCalendar etc.) und ggf. gleiche DOM-Manipulation anwenden

### Aenderungen zusammengefasst

| Datei | Aenderung |
|---|---|
| `WeightPage.tsx` | Buffer `-m-3 p-3` → `-m-5 p-5` (5 Stellen), Scroll-Expansion vor Capture im handleExport |
| `TrainingPage.tsx` | Buffer `-m-3 p-3` → `-m-5 p-5` (alle Refs) |

### Ergebnis

- KPI-Card-Schatten und Borders werden vollstaendig erfasst
- Entry-Liste zeigt im PDF alle geladenen Eintraege ohne Abschneiden
- "Mehr anzeigen"-Button ist im PDF sichtbar (oder nicht noetig, da alle Eintraege expandiert)

