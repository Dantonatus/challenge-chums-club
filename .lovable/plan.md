

# Fix: Zurueck zum externen Supabase-Projekt

## Was passiert ist

Die `client.ts` wurde faelschlicherweise auf das Lovable Cloud Projekt umgestellt. Dadurch zeigt die App nicht mehr auf dein bestehendes Projekt mit deinen Daten.

## Loesung

### Schritt 1: client.ts zuruecksetzen

Die Datei `src/integrations/supabase/client.ts` wird zurueckgesetzt auf dein externes Projekt:

- URL: `https://kehbzhcmalmqxygmhijp.supabase.co`
- Anon Key: der Key deines externen Projekts

### Schritt 2: GRANTs manuell ausfuehren

Da Migrationen nur auf dem Cloud-Projekt laufen, musst du die folgenden SQL-Befehle **manuell** in deinem Supabase-Dashboard ausfuehren (SQL Editor):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gantt_tasks TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_projects TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
```

**So gehst du vor:**
1. Oeffne dein Supabase-Dashboard unter https://supabase.com/dashboard
2. Waehle dein Projekt (kehbzhcmalmqxygmhijp)
3. Gehe zu "SQL Editor"
4. Fuege die obigen Befehle ein und klicke "Run"

### Schritt 3: Testen

Nach beiden Schritten sollte die Gantt-Projektplanung funktionieren und alle bestehenden Daten erhalten bleiben.

## Technische Details

| Aspekt | Detail |
|--------|--------|
| Aenderung | client.ts zurueck auf externes Projekt |
| Manueller Schritt | GRANTs im Supabase SQL Editor ausfuehren |
| Risiko | Keins -- Daten bleiben vollstaendig erhalten |

