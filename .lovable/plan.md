

# Feedbackgespraeche & Gespraechs-Archiv

## Konzept

Das bestehende "Geteilt"-Flag wird zu einem vollstaendigen Gespraechs-Workflow erweitert. Statt einzelne Eintraege nur als "geteilt" zu markieren, werden sie in **Feedbackrunden** (Sessions) zusammengefasst. So entsteht eine klare Historie: Welches Feedback wurde wann mit der Person besprochen?

## Workflow fuer den Nutzer

1. **Feedback sammeln** -- wie bisher, Eintraege laufend erfassen
2. **Feedbackgespraech starten** -- Button "Feedbackrunde starten" in der Timeline
3. **Eintraege auswaehlen** -- alle ungeteilten Eintraege sind vorausgewaehlt, einzelne koennen ab-/ausgewaehlt werden
4. **Runde abschliessen** -- Datum + optionale Notizen zum Gespraech erfassen, Button "Gespraech abschliessen"
5. **Archiv** -- Abgeschlossene Runden erscheinen in einem Tab "Verlauf" pro Person, chronologisch sortiert. Jede Runde ist aufklappbar und zeigt die besprochenen Eintraege.

## Aenderungen im Detail

### 1. Neue Datenbank-Tabelle: `feedback_sessions`

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid (PK) | -- |
| employee_id | uuid (FK) | Zuordnung zum Mitarbeiter |
| user_id | uuid | Eigentum / RLS |
| session_date | text | Datum des Gespraechs (YYYY-MM-DD) |
| notes | text (nullable) | Optionale Notizen zum Gespraech |
| created_at | timestamptz | -- |

### 2. Neue Spalte auf `feedback_entries`

| Spalte | Typ | Beschreibung |
|---|---|---|
| session_id | uuid (nullable, FK) | Verknuepfung zur Feedbackrunde -- NULL = noch offen |

Eintraege mit `session_id = NULL` sind aktiv/offen. Eintraege mit einer `session_id` wurden besprochen und sind im Archiv.

### 3. UI-Aenderungen

**FeedbackTimeline -- zwei Tabs:**
- **Offen** (Standard): Zeigt Erfassungsformular + alle Eintraege ohne `session_id`. Button "Feedbackrunde starten".
- **Verlauf**: Liste aller abgeschlossenen Sessions, chronologisch absteigend. Jede Session ist ein aufklappbares Akkordeon mit Datum, Notizen und den zugehoerigen Eintraegen.

**Neue Komponenten:**
- `StartSessionDialog`: Dialog zum Starten einer Runde -- zeigt alle offenen Eintraege mit Checkboxen, Datumsfeld, Notizfeld.
- `SessionCard`: Aufklappbare Karte im Verlauf-Tab mit Session-Datum, Notizen und den Eintraegen.

**Bestehende Aenderungen:**
- `FeedbackEntryCard`: Kleines Badge "Besprochen am [Datum]" wenn `session_id` gesetzt ist.
- Das bisherige "Geteilt"-Toggle wird durch den Session-Workflow ersetzt (ist_shared wird durch session_id abgeloest).

### 4. Hooks

- `useFeedbackSessions(employeeId)` -- CRUD fuer Sessions
- `useFeedbackEntries` anpassen -- Filter nach `session_id IS NULL` fuer offene Eintraege, bzw. nach `session_id` fuer Archiv

### 5. RLS-Policies

Gleiche Policies wie bei den bestehenden Tabellen: Nutzer koennen nur eigene Sessions sehen, erstellen, updaten und loeschen.

## Was sich nicht aendert

- Das Erfassen von Feedback bleibt identisch
- Mitarbeiter-Verwaltung (anlegen, archivieren, bearbeiten) bleibt identisch
- Bestehende Eintraege (die 28 von Markus) bleiben als "offen" erhalten, da sie kein session_id haben
