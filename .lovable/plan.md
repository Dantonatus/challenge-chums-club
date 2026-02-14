

# Manuelles Archivieren einzelner Feedback-Eintraege

## Was sich aendert

Einzelne Feedback-Eintraege koennen per Klick direkt ins Archiv verschoben werden -- ohne eine komplette Feedbackrunde starten zu muessen. So gibt es neben dem Session-Workflow auch einen schnellen, manuellen Weg.

## Umsetzung

### 1. Neuer Button auf der FeedbackEntryCard

Jede offene Karte bekommt in der Aktionsleiste (neben Bearbeiten und Loeschen) einen neuen "Archivieren"-Button (Archive-Icon). Beim Klick wird der Eintrag einer automatisch erstellten Einzel-Session zugeordnet und wandert damit in den Verlauf-Tab.

### 2. Logik: Einzel-Archivierung

Wenn ein einzelner Eintrag manuell archiviert wird:

- Es wird eine neue `feedback_session` erstellt mit `session_date = heute` und `notes = NULL`
- Der Eintrag bekommt die `session_id` dieser neuen Session
- Der Eintrag verschwindet aus "Offen" und erscheint im "Verlauf"

Alternativ -- und das ist die einfachere Variante -- koennte man Eintraege auch ohne Session archivieren, indem man ein `is_archived`-Flag nutzt. Da aber die bestehende Archiv-Logik komplett ueber `session_id` laeuft, ist es sauberer, eine Mini-Session zu erstellen. So bleibt die Verlauf-Ansicht konsistent.

### 3. Rueckgaengig machen

Im Verlauf-Tab kann ein archivierter Eintrag (bzw. eine Einzel-Session) wieder zurueck nach "Offen" verschoben werden. Dabei wird die `session_id` auf NULL gesetzt und die leere Session geloescht.

### 4. Betroffene Dateien

- **`src/components/feedback/FeedbackEntryCard.tsx`**: Neuer Archive-Button in der Aktionsleiste
- **`src/components/feedback/FeedbackTimeline.tsx`**: Neue Callback-Prop `onArchiveEntry` durchreichen
- **`src/hooks/useFeedbackEntries.ts`**: Neue Mutation `archiveSingle` -- erstellt Mini-Session + setzt session_id
- **`src/pages/app/feedback/FeedbackPage.tsx`**: Callback verdrahten

