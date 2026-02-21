

# Historische Body Scans einfuegen

## Was passiert

6 historische Body Scans (2015-2023) werden als neue Datensaetze in die Datenbank eingefuegt. Am bestehenden Code wird nichts veraendert.

## Die Scans

| Datum | Geraet | Gewicht | Fett % | Muskel kg |
|-------|--------|---------|--------|-----------|
| 2015-05-12 | InBody 720 | 76.8 | 9.5 | 39.8 |
| 2017-04-19 | InBody 720 | 84.2 | 13.2 | 42.3 |
| 2022-07-02 | InBody 770 | 84.1 | 11.8 | 42.5 |
| 2022-09-24 | InBody 770 | 84.5 | 11.5 | 43.3 |
| 2023-10-23 | TANITA MC-780 | 83.4 | 10.2 | 42.6 |
| 2023-12-13 | TANITA MC-780 | 84.6 | 9.1 | 43.7 |

## Technische Umsetzung

Eine einzige SQL-Migration mit 6 INSERT-Statements in die `body_scans` Tabelle. Die `segments_json` werden so gespeichert wie angegeben (mit `null`-Werten wo keine Daten vorliegen). Das `notes`-Feld aus den JSON-Objekten wird nicht gespeichert, da die Tabelle kein solches Feld hat -- es dient nur der Dokumentation.

Die bestehende Unique-Constraint (`user_id, scan_date, scan_time`) verhindert Duplikate bei erneutem Ausfuehren.

