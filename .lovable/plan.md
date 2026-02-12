

# Fix: Client-Projekt-Mismatch und fehlende GRANT-Berechtigungen

## Problem

Die App verbindet sich ueber `client.ts` mit einem externen Supabase-Projekt (kehbzhcmalmqxygmhijp), waehrend Migrationen auf dem Lovable Cloud Projekt (ofajbauoqcyiieajirex) ausgefuehrt werden. Deshalb kamen die GRANT-Befehle nie bei der richtigen Datenbank an.

## Loesung

### Option A (empfohlen): client.ts auf Lovable Cloud umstellen

Die Datei `src/integrations/supabase/client.ts` wird automatisch generiert und sollte auf das Cloud-Projekt zeigen. Da sie das nicht tut, muss sie aktualisiert werden:

- URL aendern auf: `https://ofajbauoqcyiieajirex.supabase.co`
- Anon Key aendern auf den Cloud-Key

Danach die GRANT-Migration erneut ausfuehren, diesmal auf der richtigen Datenbank.

### Option B: Grants manuell auf dem externen Projekt ausfuehren

Falls du das externe Supabase-Projekt weiterhin nutzen moechtest, muesstest du die GRANTs dort manuell im SQL-Editor ausfuehren:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gantt_tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_projects TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

## Empfehlung

Option A ist besser, da dann alle zukuenftigen Migrationen automatisch auf der richtigen Datenbank laufen. Dazu werde ich:

1. Die `client.ts` mit der korrekten Cloud-URL und dem Cloud Anon-Key aktualisieren
2. Die GRANT-Migration erneut ausfuehren (diesmal wirksam)
3. Testen ob die Tabellen erreichbar sind

## Technische Details

| Aspekt | Detail |
|--------|--------|
| Aktuelles Projekt in client.ts | kehbzhcmalmqxygmhijp (extern) |
| Lovable Cloud Projekt | ofajbauoqcyiieajirex |
| Betroffene Datei | src/integrations/supabase/client.ts |
| Migration | GRANT + NOTIFY pgrst auf Cloud DB |
| Risiko | Daten im externen Projekt sind danach nicht mehr ueber die App erreichbar -- falls dort wichtige Daten liegen, muessen sie zuerst migriert werden |

