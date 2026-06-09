## Migration: Altes Supabase-Backup → Lovable Cloud (verlustfrei, Merge-Modus)

### Ausgangslage
- **Cloud (aktiv):** Projekt `ofajbauoqcyiieajirex`. Enthält alle neueren Tabellen (body_scans, dreams, favorites, feedback, learning, planning, recipes, tasks, training_checkins, weight_entries, gantt_tasks, milestones, clients, …).
- **Backup (10.04.2025, extern):** Enthält nur die "alten" Tabellen: `groups, group_members, challenges, challenge_participants, challenge_violations, kpi_definitions, kpi_measurements, logs, payments, ideas, idea_comments, idea_votes, journal_entries, profiles, saved_views, scheduled_tips, user_friends, user_roles, approval_tokens`.
- **Regel laut deiner Wahl:** Cloud gewinnt. Backup-Zeilen werden **nur eingefügt, wenn ID noch nicht existiert** (`ON CONFLICT (id) DO NOTHING`). Es wird nichts überschrieben, nichts gelöscht.
- **Auth-Limit:** `auth.users` kann technisch nicht migriert werden (Passwort-Hashes sind instanz-gebunden). User müssen sich neu registrieren; danach werden ihre alten Daten per Mapping zugeordnet.

### Ablauf in 4 Phasen

#### Phase 1 — Vollständiges Sicherheits-Backup (vor jedem Schreibvorgang)
- Export **aller** aktuellen Cloud-`public.*`-Tabellen als komplette SQL-Datei via `pg_dump`-Stil-Script (Schema + Daten, eine Datei pro Tabelle + ein kombiniertes Master-SQL).
- Ablage: `/mnt/documents/cloud-backup-pre-migration-2026-06-09.sql` + ZIP-Archiv mit Einzeltabellen.
- Du bekommst beides als Download-Artefakt — Rollback jederzeit möglich.

#### Phase 2 — Analyse & Mapping vorbereiten
- Dump entpacken, alle `COPY public.<tabelle>` Blöcke parsen → JSON pro Tabelle in `/tmp`.
- Sammlung aller eindeutigen `user_id`s aus dem Backup (über alle Tabellen).
- Vergleich mit aktuellen `auth.users` in Cloud. Zwei Listen entstehen:
  - **Direkt-Match-Liste** (UUID existiert in Cloud bereits) → Zeilen können sofort eingespielt werden.
  - **Mapping-Bedarf-Liste** (UUID existiert nicht in Cloud) → wird als CSV exportiert nach `/mnt/documents/user-mapping-todo.csv` mit Spalten `old_user_id, display_name_aus_profiles, anzahl_zeilen_betroffen, new_user_id (leer)`.

#### Phase 3 — Erst-Import (Direct Match)
Reihenfolge (Fremdschlüssel-konform):
```text
groups → profiles → group_members → user_roles → user_friends
→ challenges → challenge_participants → challenge_violations
→ kpi_definitions → kpi_measurements
→ logs → payments
→ ideas → idea_comments → idea_votes
→ journal_entries → saved_views → scheduled_tips → approval_tokens
```
Pro Tabelle:
- `INSERT INTO public.<t> (…) VALUES (…) ON CONFLICT (id) DO NOTHING`
- Skip-Bedingung: Zeile wird übersprungen, wenn `user_id` (bzw. `owner_id`/`created_by`/`friend_user_id`) **nicht** in `auth.users` existiert — landet in Report.
- Skip-Bedingung 2: Zeile wird übersprungen, wenn referenzierte FK (z. B. `challenge_id`, `group_id`) nach Import nicht existiert.
- Alle Skips → `/mnt/documents/migration-skipped-rows.json` (Tabelle, ID, Grund).

Ergebnis-Report: `/mnt/documents/migration-report-2026-06-09.md` mit pro-Tabelle: inserted / skipped-existing / skipped-orphan-user / skipped-orphan-fk.

#### Phase 4 — Nachträgliches Remapping (nach Neuregistrierungen)
Damit du später (wenn die User sich neu registriert haben) ihre Altdaten zuordnen kannst:
- Einmalige **Admin-Edge-Function** `remap-legacy-user` (nur für `admin`-Rolle, JWT-validiert).
- Input: `{ old_user_id: uuid, new_user_id: uuid }`.
- Aktion: für jede betroffene Tabelle `UPDATE … SET user_id = new WHERE user_id = old` (inkl. owner_id/created_by/friend_user_id-Varianten) — in einer Transaktion.
- Du füllst die CSV `user-mapping-todo.csv` sukzessive aus und triggerst die Function (oder es entsteht ein simples Admin-UI dafür — sag mir, falls gewünscht).
- Bis dahin liegen die "verwaisten" Backup-Zeilen unangetastet in `/mnt/documents/orphan-rows-pending.sql` und werden **nicht** in Cloud geschrieben — kein RLS-Bruch, kein Datenmüll, aber auch kein Verlust.

### Wichtige Garantien
- **Kein UPDATE/DELETE** auf bestehende Cloud-Daten in Phase 1–3.
- **Kein** Schema-Change an bestehenden Tabellen (alle Spalten existieren bereits).
- Alles in einer Transaktion pro Tabelle → bei Fehler kein Halbzustand.
- Vor jedem Schritt liegt ein vollständiges Backup als Datei bei dir.

### Technische Details
| Tabelle | Konflikt-Schlüssel | User-Spalten zur Validierung |
|---|---|---|
| groups | id | owner_id |
| profiles | id | id (== auth.users.id) |
| group_members | id | user_id |
| user_roles | id | user_id |
| user_friends | id | user_id, friend_user_id |
| challenges | id | created_by + group_id (FK) |
| challenge_participants | id | user_id + challenge_id (FK) |
| challenge_violations | id | user_id + challenge_id (FK) |
| kpi_definitions | id | challenge_id (FK) |
| kpi_measurements | id | user_id + kpi_definition_id (FK) |
| logs | id | user_id + challenge_id (FK) |
| payments | id | user_id + group_id (FK) |
| ideas | id | created_by + group_id (FK) |
| idea_comments | id | user_id + idea_id (FK) |
| idea_votes | id | user_id + idea_id (FK) |
| journal_entries | id | user_id |
| saved_views | id | user_id |
| scheduled_tips | id | user_id (nullable) |
| approval_tokens | id | user_id |

Edge Function `remap-legacy-user`: Datei `supabase/functions/remap-legacy-user/index.ts`, nutzt `SUPABASE_SERVICE_ROLE_KEY`, prüft `has_role(auth.uid(), 'admin')`, führt `UPDATE`s in fester Reihenfolge aus, returned `{ updated_per_table }`.

### Was du am Ende erhältst
1. `/mnt/documents/cloud-backup-pre-migration-2026-06-09.sql` (Rollback)
2. `/mnt/documents/migration-report-2026-06-09.md` (Zusammenfassung)
3. `/mnt/documents/migration-skipped-rows.json` (Detail-Log)
4. `/mnt/documents/user-mapping-todo.csv` (Mapping-Vorlage)
5. `/mnt/documents/orphan-rows-pending.sql` (verwaiste Zeilen, ungeschrieben)
6. Edge Function `remap-legacy-user` für den späteren Step-by-Step-Remap.
