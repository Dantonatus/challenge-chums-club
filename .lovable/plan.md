

# Fix: "Could not find table 'public.gantt_tasks' in schema cache"

## Problem

Die Tabellen `gantt_tasks` und `planning_projects` existieren in der Datenbank, aber der PostgREST-Schema-Cache kennt sie noch nicht. Deshalb schlagen alle Supabase-JS-Client-Aufrufe (`.from('gantt_tasks')`) fehl.

## Ursache

Wenn Tabellen direkt erstellt wurden, ohne dass PostgREST seinen Cache aktualisiert hat, sind sie uber SQL erreichbar, aber nicht uber die REST-API.

## Losung

Eine leere Migration ausfuhren, die PostgREST zwingt, den Schema-Cache neu zu laden. Zusatzlich sicherstellen, dass alle Foreign Keys und RLS-Policies korrekt sind.

### Schritt 1: Schema-Cache-Refresh via Migration

Eine minimale Migration ausfuhren die:
- `NOTIFY pgrst, 'reload schema'` sendet (erzwingt Cache-Refresh)
- Sicherheitshalber die Tabellen mit `IF NOT EXISTS` erneut deklariert
- RLS-Policies verifiziert

```sql
-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
```

### Schritt 2: Verifizierung

Nach der Migration testen, ob der Supabase-JS-Client die Tabellen erreichen kann, indem eine Aufgabe erstellt wird.

## Technische Details

| Aktion | Detail |
|--------|--------|
| Migration | `NOTIFY pgrst, 'reload schema'` |
| Betroffene Tabellen | `gantt_tasks`, `planning_projects` |
| Code-Anderungen | Keine -- der bestehende Code ist korrekt |
| Risiko | Keins -- nur Cache-Refresh, keine Datenbankanderung |
