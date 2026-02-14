

# Migration: Markus Heid Feedback-Daten

## Was passiert

Die 28 bestehenden Tasks mit Feedback zu Markus werden als Eintraege in das neue Feedback-Modul uebernommen. Dafuer wird:

1. Ein Mitarbeiter "Markus Heid" (Rolle: Geschaeftsfuehrer) angelegt
2. Alle 28 Feedback-Eintraege migriert

## Daten-Mapping

| Task-Feld | Feedback-Feld | Logik |
|---|---|---|
| Titel (nach Datum+Name) | content | Text nach dem Praefix "Markus:" / "Markus_" |
| Datum im Titel (z.B. 11.01.26) | entry_date | Geparstes Datum, Fallback: created_at |
| Beschreibung (falls vorhanden) | content (angehaengt) | Wird an den Titel-Text angehaengt |
| -- | category | Default: "observation" (kann spaeter angepasst werden) |
| -- | sentiment | Default: "neutral" (kann spaeter angepasst werden) |
| -- | is_shared | false |

## Mitarbeiter-Profil

- **Name**: Markus Heid
- **Rolle**: Geschaeftsfuehrer
- **Farbe**: Blau (#3B82F6) -- oder nach Wunsch anpassbar

## Umsetzung

Eine SQL-Migration, die:

1. Den Mitarbeiter in `feedback_employees` anlegt (mit der user_id des aktuellen Nutzers)
2. Alle 28 Eintraege in `feedback_entries` einfuegt mit dem jeweiligen Datum aus dem Titel
3. Die Original-Tasks bleiben erhalten (kein Loeschen, das kann spaeter manuell passieren)

## Technische Details

Die Migration verwendet die `user_id` aus den bestehenden Tasks, um sicherzustellen, dass die Daten dem richtigen Nutzer zugeordnet werden. Das Datum wird aus dem Titel-Praefix (Format DD.MM.YY) extrahiert und in YYYY-MM-DD konvertiert.

