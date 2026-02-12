

# Fix: client.ts auf Lovable Cloud umstellen + Daten migrieren

## Kernproblem

Die Datei `src/integrations/supabase/client.ts` ist veraltet und zeigt auf ein altes Backend (`kehbzhcmalmqxygmhijp`), waehrend Lovable Cloud ein anderes Backend nutzt (`ofajbauoqcyiieajirex`). Alle Migrationen (inkl. gantt_tasks/planning_projects) laufen auf dem Cloud-Backend, aber die App fragt das alte Backend ab.

## Ist-Zustand

| Backend | Tabellen | Daten | gantt_tasks |
|---------|----------|-------|-------------|
| Alt (`kehbzhcmalmqxygmhijp`) | Ja (ohne gantt_tasks) | Vorhanden (Challenges, Profile, etc.) | Fehlt |
| Cloud (`ofajbauoqcyiieajirex`) | Alle (inkl. gantt_tasks) | Leer | Vorhanden mit GRANT |

## Loesung (2 Schritte)

### Schritt 1: Alte Daten sichern und ins Cloud-Backend uebertragen

Eine Backend-Funktion (Edge Function) erstellen, die die Daten vom alten Backend liest und ins Cloud-Backend schreibt. Betrifft Tabellen mit Nutzerdaten:
- `profiles`, `groups`, `group_members`
- `challenges`, `challenge_participants`, `challenge_violations`, `logs`
- `ideas`, `idea_comments`, `idea_votes`
- `projects`, `tasks`, `subtasks`, `task_tags`, `tags`
- `clients`, `milestones`, `planning_projects`
- `recipes`, `recipe_favorites`, `shopping_list_items`, `ingredient_matches`
- `saved_views`, `task_preferences`, `journal_entries`, `payments`
- `user_roles`, `user_friends`, `scheduled_tips`, `approval_tokens`, `task_audit_log`
- `kpi_definitions`, `kpi_measurements`

### Schritt 2: client.ts aktualisieren

Die Datei `client.ts` wird automatisch generiert und sollte sich automatisch auf die Cloud-Credentials aktualisieren. Falls das nicht passiert, muss sie manuell auf die Werte aus `.env` umgestellt werden:
- URL: `https://ofajbauoqcyiieajirex.supabase.co`
- Key: der Cloud anon key

## Auswirkung auf bestehende Daten

- Keine Daten gehen verloren -- sie werden vorher kopiert
- Nach der Migration funktionieren alle Features (alt und neu) auf dem Cloud-Backend
- Die Planungstabellen (`gantt_tasks`, `planning_projects`) funktionieren sofort, da sie bereits existieren und korrekte Berechtigungen haben

## Risiken und Einschraenkungen

- Auth-User-IDs: Die Nutzer muessen sich auf dem Cloud-Backend neu registrieren, da `auth.users` nicht uebertragen werden kann. Die Daten muessen dann den neuen User-IDs zugeordnet werden.
- Alternativ: Wenn nur wenige Nutzer existieren, koennen sie sich neu registrieren und die Daten manuell zugeordnet werden.

## Empfohlener Ansatz (einfachster Weg)

Da die Cloud-Instanz leer ist und die `client.ts` eigentlich automatisch aktualisiert werden sollte:

1. **client.ts auf Cloud umstellen** (einzige Code-Aenderung)
2. **Nutzer bitten, sich neu zu registrieren** auf dem Cloud-Backend
3. Falls alte Daten wichtig sind: eine Migrations-Edge-Function bereitstellen

Fuer die **Projektplanung** (gantt_tasks) gibt es noch keine alten Daten -- dieses Feature funktioniert sofort nach der Umstellung.

## Technische Details

Einzige Code-Aenderung in `src/integrations/supabase/client.ts`:

```text
const SUPABASE_URL = "https://ofajbauoqcyiieajirex.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "[Cloud anon key aus .env]";
```

Keine weiteren Code-Aenderungen noetig -- alle Hooks und Komponenten nutzen bereits den importierten Client.

