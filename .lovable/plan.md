

# Fix: GRANT-Berechtigungen fuer gantt_tasks und planning_projects

## Problem

Die vorherige Migration hat die GRANT-Befehle nicht korrekt angewendet. Die Abfrage von `information_schema.table_privileges` fuer `gantt_tasks` liefert ein leeres Ergebnis -- das bedeutet, keine Rolle hat Zugriff auf die Tabelle ueber die REST-API.

## Ursache

Ohne explizite `GRANT`-Befehle kann PostgREST die Tabellen nicht im Schema-Cache finden, selbst wenn RLS-Policies existieren. Die vorherigen Migrationen haben die GRANTs nicht erfolgreich angewendet.

## Loesung

Eine neue Migration ausfuehren mit den fehlenden GRANT-Befehlen:

```sql
GRANT ALL ON public.gantt_tasks TO anon, authenticated;
GRANT ALL ON public.planning_projects TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

## Auswirkung auf bestehende Daten

- Keine Daten gehen verloren
- Es werden nur Zugriffsberechtigungen hinzugefuegt
- RLS-Policies bleiben aktiv und schuetzen die Daten weiterhin
- Der bestehende Code bleibt unveraendert

## Technische Details

| Aspekt | Detail |
|--------|--------|
| Betroffene Tabellen | `gantt_tasks`, `planning_projects` |
| Aktion | `GRANT ALL` fuer `anon` und `authenticated` |
| Code-Aenderungen | Keine |
| Risiko | Keins -- nur Berechtigungen, keine Datenbankaenderung |
| Datenverlust | Ausgeschlossen |

