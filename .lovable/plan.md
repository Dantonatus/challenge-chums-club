

## Fix: Morgens/Abends-Filter korrigieren

### Problem
1. **Falsche Zeitgrenzen**: Aktuell ist "Morgens" = 04:00-11:59 und "Abends" = 17:00-03:59. Werte zwischen 12:00-16:59 werden komplett herausgefiltert.
2. **Gewuenschte Logik**: Morgens = vor 15:00 (oder wenn keine Uhrzeit vorhanden), Abends = ab 15:00.
3. **Filter wird nicht ueberall angewendet**: Die Uebersicht-Tab nutzt `unifiedEntries` statt `filteredScaleEntries`, der Zeitfilter wirkt dort nicht.

### Aenderungen

**Datei 1: `src/lib/smartscale/analytics.ts`** - Funktion `filterByTimeOfDay`

Neue Logik:
- `morning`: Stunde < 15, ODER wenn keine gueltige Uhrzeit parsbar ist
- `evening`: Stunde >= 15
- `all`: keine Filterung

Gleichzeitig `morningVsEvening` anpassen (wird fuer den Tagesvergleich genutzt): Grenze ebenfalls auf 15:00 setzen.

**Datei 2: `src/pages/app/training/WeightPage.tsx`** - Uebersicht-Tab

Den Zeitfilter auch auf die `unifiedEntries` anwenden, damit die Uebersicht (KPIs, Chart, Heatmap) ebenfalls nur Morgens- oder Abends-Werte zeigt. Dazu die `mergeWeightSources`-Funktion mit den bereits gefilterten Scale-Entries aufrufen, oder die unified Entries nachtraeglich filtern.

### Technische Details

```typescript
// analytics.ts - neue filterByTimeOfDay Logik
export function filterByTimeOfDay(entries: SmartScaleEntry[], slot: TimeSlot): SmartScaleEntry[] {
  if (slot === 'all') return entries;
  return entries.filter(e => {
    const hourStr = e.measured_at.slice(11, 13);
    const hour = parseInt(hourStr, 10);
    // Falls keine Uhrzeit parsbar -> als "morgens" zaehlen
    if (isNaN(hour)) return slot === 'morning';
    if (slot === 'morning') return hour < 15;
    return hour >= 15; // evening
  });
}

// morningVsEvening - Grenze ebenfalls 15:00
morning: hour < 15
evening: hour >= 15
```

Fuer die Uebersicht: `unifiedEntries` durch den Zeitfilter leiten, sodass auch die Weight-Timeline, KPIs und Heatmap den Filter respektieren.
