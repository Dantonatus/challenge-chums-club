

## Export-Paket: Planungsmodul erstellen

Ich erstelle jetzt das vollstaendige Export-Paket nach `/mnt/documents/planning-export/` mit folgenden Dateien:

### Dateien

| Datei | Inhalt |
|---|---|
| `README.md` | Setup-Anleitung: DB-Schema, Dependencies, Supabase-Config, Routing |
| `schema.sql` | CREATE TABLE fuer `clients`, `planning_projects`, `milestones`, `gantt_tasks` + RLS-Policies |
| `seed-data.sql` | INSERT-Statements mit allen aktuellen Daten (6 Clients, 5 Projekte, 28 Meilensteine, 5 Gantt-Tasks) |
| `file-manifest.md` | Vollstaendige Liste aller ~31 Frontend-Dateien mit Pfaden und Beschreibungen |

### Vorgehen

1. DB-Daten per `psql` exportieren (alle 4 Tabellen)
2. Schema aus bestehenden Migrationen und Tabellenstruktur ableiten
3. Frontend-Dateiliste aus dem Codebase zusammenstellen
4. README mit Schritt-fuer-Schritt-Anleitung generieren

Die Dateien sind danach sofort in der **Files**-Ansicht verfuegbar.

