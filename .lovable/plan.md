
# Gewichtseintraege bearbeiten und loeschen

## Uebersicht

Gewichtseintraege koennen aktuell nur hinzugefuegt werden. Es fehlt die Moeglichkeit, fehlerhafte Eintraege zu korrigieren oder zu loeschen. Das wird ueber eine editierbare Eintrags-Liste und Inline-Aktionen geloest.

## Loesung: Weight Entry History mit Edit/Delete

### 1. Neuer Hook: `deleteWeightEntry` Mutation in `useWeightEntries.ts`

- Neue `deleteMutation` hinzufuegen die per `id` loescht
- Neue `updateMutation` die per `id` Gewicht und/oder Datum aktualisiert
- Beide invalidieren die Query-Keys `weight-entries` und `forecast-snapshots`

### 2. Neue Komponente: `WeightEntryList.tsx`

Eine kompakte, scrollbare Liste der letzten Eintraege (neueste zuerst):

- Jede Zeile zeigt: **Datum** | **Uhrzeit** | **Gewicht (kg)** | Edit-Icon | Delete-Icon
- **Edit**: Oeffnet Inline-Edit (Input-Feld ersetzt den Gewichtswert, Enter speichert, Escape bricht ab)
- **Delete**: Bestaetigung via AlertDialog ("Eintrag vom 15.02 loeschen?"), dann Loeschung
- Maximal die letzten 30 Eintraege anzeigen, aeltere per "Mehr laden" nachladen
- Kompaktes Design passend zum bestehenden Card-Stil

### 3. Integration in `WeightPage.tsx`

- `WeightEntryList` wird unterhalb der KPI-Cards und oberhalb der Heatmap eingefuegt
- Bekommt `entries`, `onUpdate`, `onDelete` als Props

## Technische Details

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/hooks/useWeightEntries.ts` | `update` und `remove` Mutations hinzufuegen |
| `src/components/weight/WeightEntryList.tsx` | **Neu** -- Editierbare Eintrags-Liste |
| `src/pages/app/training/WeightPage.tsx` | WeightEntryList einbinden |

### useWeightEntries Erweiterung

```text
update: useMutation
  - Input: { id: string, weight_kg: number }
  - Supabase: .update({ weight_kg }).eq('id', id)
  - Invalidiert weight-entries + forecast-snapshots

remove: useMutation
  - Input: { id: string }
  - Supabase: .delete().eq('id', id)
  - Invalidiert weight-entries + forecast-snapshots
```

### WeightEntryList Aufbau

```text
+----------------------------------------------+
| Letzte Eintraege                    [History] |
+----------------------------------------------+
| 19.02.2026  08:15   82.3 kg    [Edit] [Del]  |
| 18.02.2026  07:50   82.1 kg    [Edit] [Del]  |
| 17.02.2026  08:00   82.5 kg    [Edit] [Del]  |
| ...                                           |
| [Mehr anzeigen]                               |
+----------------------------------------------+

Edit-Modus fuer eine Zeile:
| 18.02.2026  07:50   [___82.1___] kg  [OK] [X] |
```
