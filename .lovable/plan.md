

## Fix: Kunde-Aktualisierung wird nicht in der Kalenderansicht reflektiert

### Problem
Wenn ein Kunde bearbeitet und gespeichert wird, invalidiert `updateClient` nur den `['clients']`-Query-Cache. Die Kalenderansicht (Quarter/HalfYear) bezieht ihre Client-Daten jedoch aus dem `['milestones']`-Query (via Supabase-Join `client:clients(*)`). Dieser Cache wird nicht aktualisiert, weshalb die Aenderungen nicht sichtbar werden.

### Loesung

**Datei: `src/hooks/useClients.ts`** - In der `onSuccess`-Callback von `updateClient` (Zeile 82-85) zusaetzlich den Milestones-Cache invalidieren:

```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['clients'] });
  queryClient.invalidateQueries({ queryKey: ['milestones'] });
  toast({ title: 'Kunde aktualisiert' });
},
```

Gleiche Aenderung fuer `deleteClient.onSuccess` (Zeile 100-103), da dort bereits `['milestones']` invalidiert wird - das ist bereits korrekt implementiert.

Eine einzelne Zeile in einer Datei.
