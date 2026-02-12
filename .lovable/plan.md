

# Fix: Fehlende GRANT-Berechtigungen auf `gantt_tasks` und `planning_projects`

## Problem

Die Tabellen existieren und haben RLS-Policies, aber die PostgreSQL-Rollen `anon` und `authenticated` haben keine GRANT-Berechtigungen (SELECT, INSERT, UPDATE, DELETE). Ohne diese Grants kann PostgREST die Tabellen nicht im Schema-Cache finden.

## Ursache

Bei der urspruenglichen Tabellenerstellung wurden die `GRANT`-Befehle vergessen. RLS-Policies allein reichen nicht -- die Rollen brauchen grundsaetzliche Tabellenberechtigungen.

## Loesung

Eine Migration ausfuehren, die den Rollen `anon` und `authenticated` die notwendigen Berechtigungen erteilt:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gantt_tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_projects TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

## Technische Details

| Aspekt | Detail |
|--------|--------|
| Betroffene Tabellen | `gantt_tasks`, `planning_projects` |
| Fehlende Grants | SELECT, INSERT, UPDATE, DELETE fuer `anon` und `authenticated` |
| Code-Aenderungen | Keine -- nur DB-Migration |
| Risiko | Keins -- RLS-Policies schuetzen die Daten weiterhin |

