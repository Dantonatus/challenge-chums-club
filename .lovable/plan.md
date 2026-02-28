
## Fix: Mehrere Messpunkte pro Tag im Gewichts-Timeline beibehalten

### Problem
`mergeWeightSources()` mittelt alle Scale-Eintraege eines Tages zu **einem** Wert und speichert nur die Uhrzeit der ersten Messung. Wenn du z.B. um 08:15 und 21:15 misst, wird daraus ein Durchschnitt mit Uhrzeit "08:15". Beim Filter "Abends" verschwindet dieser Eintrag, weil 08:15 < 15:00.

### Loesung
Scale-Eintraege nicht mehr pro Tag mitteln, sondern **jeden einzeln** in die Timeline uebernehmen. Manuelle Eintraege bleiben bestehen, werden aber von Scale-Eintraegen auf gleichem Datum+Zeitslot ueberschrieben.

### Aenderung

**Datei: `src/lib/weight/unifiedTimeline.ts`**

Neue Logik fuer `mergeWeightSources`:
1. Alle manuellen Eintraege in eine Map mit Key `datum-zeit` einfuegen
2. Alle Scale-Eintraege **einzeln** (nicht gemittelt) hinzufuegen, Key = `datum-HH:MM`
3. Bei Kollision gewinnt der Scale-Eintrag (praeziser)
4. Sortierung nach Datum + Uhrzeit

```typescript
export function mergeWeightSources(
  manualEntries: WeightEntry[],
  scaleEntries: SmartScaleEntry[],
): UnifiedWeightEntry[] {
  const result = new Map<string, UnifiedWeightEntry>();

  // Manuelle Eintraege
  for (const e of manualEntries) {
    const key = `${e.date}_${e.time ?? '00:00'}`;
    result.set(key, { ...e, source: 'manual' });
  }

  // Scale-Eintraege einzeln (ueberschreiben manuelle bei gleicher Zeit)
  for (const e of scaleEntries) {
    if (e.weight_kg === null) continue;
    const date = e.measured_at.slice(0, 10);
    const time = e.measured_at.slice(11, 16);
    const key = `${date}_${time}`;
    result.set(key, {
      id: e.id,
      user_id: e.user_id,
      date,
      time,
      weight_kg: e.weight_kg,
      created_at: e.created_at,
      source: 'scale',
    });
  }

  return [...result.values()].sort((a, b) =>
    a.date === b.date
      ? (a.time ?? '').localeCompare(b.time ?? '')
      : a.date.localeCompare(b.date)
  );
}
```

Keine weiteren Dateien betroffen. Der bestehende Zeitfilter in `WeightPage.tsx` funktioniert bereits korrekt mit dem `time`-Feld -- jetzt hat jeder Eintrag seine echte Uhrzeit, und Morgens/Abends-Filterung greift sauber.
