

# Learning-Modul: Smart Paste Knowledge Base

## Konzept

Du kopierst beliebigen Text (Artikel-Auszuege, Notizen, Chat-Nachrichten, etc.) in ein grosses Textfeld und drueckst "Verarbeiten". Eine KI-Funktion analysiert den Inhalt und erstellt daraus automatisch:

- **Titel** (kurz, praegnant)
- **Zusammenfassung** (2-3 Saetze)
- **Kategorie/Topic** (aus bestehenden Topics oder Vorschlag fuer neues)
- **Tags** (Schlagworte)
- **Kernpunkte** (Bullet Points mit den wichtigsten Erkenntnissen)
- **Originaltext** (bleibt vollstaendig erhalten)

Der Originaltext geht nie verloren -- er wird gespeichert und ist jederzeit aufklappbar.

## Benutzerfluss

```text
1. User oeffnet Learning-Seite
2. Grosses Textfeld oben: "Paste deinen Inhalt hier..."
3. User fuegt Text ein (beliebig lang)
4. Klick auf "Verarbeiten"
5. KI analysiert und zeigt Vorschau:
   - Vorgeschlagener Titel
   - Zusammenfassung
   - Vorgeschlagenes Topic (Dropdown zum Aendern)
   - Tags (editierbar)
   - Kernpunkte als Liste
6. User kann alles anpassen oder direkt "Speichern"
7. Nugget erscheint in der Liste, schoene Karte
```

## UI-Aufbau

```text
+----------------------------------------------------------+
|  [Textarea: "Fuege Text, Artikel, Notizen ein..."]       |
|  [                                                    ]   |
|  [                                                    ]   |
|  [Button: Verarbeiten]                                    |
+----------------------------------------------------------+
|  Topic-Chips: [Alle] [Ernaehrung] [Tech] [Business] ...  |
|  [Suchfeld]                                               |
+----------------------------------------------------------+
|  [Nugget Card]  Titel + Zusammenfassung + Tags            |
|    > Kernpunkte aufklappbar                               |
|    > Originaltext aufklappbar                             |
|  [Nugget Card]  ...                                       |
|  [Nugget Card]  ...                                       |
+----------------------------------------------------------+
```

## Datenbank

### Tabelle: `learning_topics`

| Spalte | Typ | Default |
|--------|-----|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | |
| name | text NOT NULL | |
| emoji | text | |
| color | text | '#3B82F6' |
| sort_order | integer | 0 |
| created_at | timestamptz | now() |

### Tabelle: `learning_nuggets`

| Spalte | Typ | Default |
|--------|-----|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid NOT NULL | |
| topic_id | uuid FK | |
| title | text NOT NULL | |
| summary | text | KI-generierte Zusammenfassung |
| key_points | jsonb | Array von Bullet Points |
| content | text | Originaltext (vollstaendig) |
| source | text | Optionale Quellenangabe |
| tags | text[] | KI-generierte Schlagworte |
| is_pinned | boolean | false |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

Beide Tabellen: RLS mit `user_id = auth.uid()` fuer alle CRUD-Operationen.

## Edge Function: `process-learning-content`

- Empfaengt den Rohtext
- Nutzt `LOVABLE_API_KEY` mit einem Gemini/GPT-Modell (gleiche Architektur wie `generate-recipe`)
- Prompt: "Analysiere diesen Text und extrahiere Titel, Zusammenfassung, 3-7 Kernpunkte, Kategorie-Vorschlag, und 2-5 Tags. Antworte als JSON."
- Gibt strukturiertes JSON zurueck
- Der Originaltext wird NICHT an die KI-Antwort gehaengt, sondern separat im Frontend gespeichert

## Neue Dateien

| Datei | Zweck |
|-------|-------|
| `supabase/functions/process-learning-content/index.ts` | KI-Verarbeitung |
| `src/pages/app/learning/LearningPage.tsx` | Hauptseite |
| `src/components/learning/PasteCapture.tsx` | Grosses Textfeld + Verarbeiten-Button |
| `src/components/learning/ProcessingPreview.tsx` | Vorschau nach KI-Analyse (editierbar) |
| `src/components/learning/NuggetCard.tsx` | Karte fuer gespeichertes Nugget |
| `src/components/learning/TopicChips.tsx` | Horizontale Topic-Filter |
| `src/components/learning/NuggetDetailSheet.tsx` | Detail-Ansicht mit Originaltext |
| `src/components/learning/CreateTopicDialog.tsx` | Neues Topic erstellen |
| `src/hooks/useLearningTopics.ts` | CRUD fuer Topics |
| `src/hooks/useLearningNuggets.ts` | CRUD + Suche fuer Nuggets |

## Bestehende Dateien (Anpassungen)

| Datei | Aenderung |
|-------|-----------|
| `src/App.tsx` | Route `/app/learning` hinzufuegen |
| `src/components/layout/AppLayout.tsx` | "Learning" in PRIMARY_NAV (Icon: `BookOpen`) |

## Nugget-Karte: Darstellung

Jede Karte zeigt:
- **Titel** (fett, gross)
- **Topic-Badge** (farbig, mit Emoji)
- **Zusammenfassung** (1-3 Zeilen, Text)
- **Tags** als kleine Badges
- **Zeitstempel** ("vor 2 Tagen")
- Aufklappbar: **Kernpunkte** (Bullet-Liste)
- Aufklappbar: **Originaltext** (grauer Hintergrund, monospace-aehnlich)
- Pin-Icon zum Anpinnen

## Features

1. **Paste und Verarbeiten**: Rohtext einfuegen, KI strukturiert automatisch
2. **Editierbare Vorschau**: Vor dem Speichern alles anpassen
3. **Topic-Management**: Topics erstellen, Farbe/Emoji waehlen
4. **Freitextsuche**: Durchsucht Titel, Zusammenfassung, Originaltext
5. **Topic-Filter**: Chips oben zum schnellen Filtern
6. **Pinning**: Wichtige Nuggets oben anpinnen
7. **Originaltext bewahrt**: Immer aufklappbar, nichts geht verloren

