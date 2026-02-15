

# Feedback-Eintraege aus Tasks migrieren

## Uebersicht

In den Tasks befinden sich Feedback-Notizen zu Personen, die bereits als Feedback-Mitarbeiter angelegt sind. Diese sollen als Feedback-Eintraege verschoben werden. Markus Heid ist bereits vollstaendig migriert (29 Eintraege). Fuer **Marcel Juschak** und **Paul Wenner** fehlen die Eintraege komplett.

Fuer **Kathrin Apostel** und **Jacob** gibt es keine Tasks mit Feedback-Charakter.

## Was wird migriert

### Marcel Juschak (6 Eintraege)

| Datum | Inhalt | Sentiment |
|---|---|---|
| 29.12.25 | Keine Uebergabe JF/Dailey.. Haette mich oder Markus fragen muessen. Grundsaetzlich brauchen wir mehr Klarheit und Visibility fuer Urlaube. | constructive |
| 05.01.26 | "i'm on holiday"..Keine Uebergabe.. Paul wusste nicht was er tun sollte. | constructive |
| 06.01.26 | Daily begonnen mit "Whats the status".. danach "You have enough to do"... wirkt nicht strukturiert | constructive |
| 12.01.26 | Hab das Gefuehl bei harten Deadlines, Projektgeschaeft entsteht das meiste und danach schlaeft alles ein. Zudem koennte er staerker Ownership uebernehmen. | constructive |
| 12.01.26 | Verwaltung von Tenants nicht ideal, Passwoerter auf Confluence oder Teams gespeichert. Warum haben wir keinen PW-Manager? | observation |
| 15.01.26 | Hat Initial gesagt, Danke Daniel fuer die Vorarbeit in den Excel und die Interpretation, schaetze ich extrem. Gutes Development! | positive |

### Paul Wenner (2 Eintraege)

| Datum | Inhalt | Sentiment |
|---|---|---|
| 12.01.26 | Manchmal hat er nichts zu tun, bzw. weiss nicht was er tun soll. Es gibt genug zu tun, was braucht er, damit er das auch sieht? | constructive |
| 14.01.26 | Von 14-22 Uhr arbeiten ist nichts.. das ist too far off von allen anderen, wenn irgendwas nicht laeuft, muss man immer bis zum naechsten Tag warten | constructive |

## Technische Umsetzung

Die Migration wird als **einmaliges SQL-Statement** ausgefuehrt (ueber das Datenbank-Migrations-Tool):

1. **8 neue Feedback-Eintraege** in `feedback_entries` einfuegen mit korrektem `employee_id`, `user_id`, `entry_date`, `content`, `category` (observation/improvement), `sentiment`
2. **Die 8 Quell-Tasks** werden anschliessend als `is_archived = true` markiert, damit sie aus der aktiven Task-Liste verschwinden aber nicht geloescht werden

Kein Code-Aenderung noetig -- nur Daten-Migration.

### Betroffene Task-IDs

Marcel: `3a8ef7cd`, `3d1d691a`, `8af7f000`, `bdfe6fae`, `35f2b6d3`, `046b6521`
Paul: `c6be13ce`, `970e77d7`
