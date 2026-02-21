

# Korrektur historischer Body-Scan-Daten

## Problem

Alle 6 historischen Scans (2015-2023) haben falsche Werte in der Datenbank. Betroffen sind:

1. **muscle_mass_kg** bei allen 6 Scans (Werte sind ca. 27-30 kg zu niedrig)
2. **segments_json** bei 3 Scans (fehlende oder komplett falsche Segment-Werte)
3. **bone_mass_kg** bei mehreren Scans

## Korrekturen im Detail

### muscle_mass_kg + bone_mass_kg

| Datum | muscle_mass_kg alt -> neu | bone_mass_kg alt -> neu |
|-------|--------------------------|------------------------|
| 2015-05-12 | 39.8 -> 66.4 | ? -> 3.1 |
| 2017-04-19 | 42.3 -> 69.7 | ? -> 3.4 |
| 2022-07-02 | 42.5 -> 70.8 | ? -> 3.4 |
| 2022-09-24 | 43.3 -> 71.3 | ? -> 3.4 |
| 2023-10-23 | 42.6 -> 71.6 | ? -> 3.3 |
| 2023-12-13 | 43.7 -> 73.5 | ? -> 3.4 |

### segments_json Korrekturen

**2022-07-02**: Muskel-Segmente von null auf echte Werte, Fett-Segmente komplett korrigieren
- Muscle: trunk=33.1, armL=4.43, armR=4.5, legL=11.38, legR=11.42
- Fat: trunk=13.8, armL=4.3, armR=4.3, legL=11.6, legR=11.6

**2022-09-24**: Alle Segmente von null auf echte Werte setzen
- Muscle: trunk=33.1, armL=4.4, armR=4.5, legL=11.05, legR=11.14
- Fat: trunk=13.8, armL=6.4, armR=4.3, legL=11.2, legR=11.2

**2023-10-23**: Fett-Segmente korrigieren
- Fat: trunk=12.8, armL=7.8, armR=7.5, legL=4.4, legR=4.4

## Umsetzung

6 SQL UPDATE-Statements gegen die body_scans Tabelle, jeweils identifiziert ueber `scan_date` + `scan_time`. Keine Schema-Aenderung noetig, nur Datenkorrektur.

## Technische Details

```text
UPDATE body_scans SET muscle_mass_kg = X, bone_mass_kg = Y, segments_json = '{...}'
WHERE scan_date = '...' AND scan_time = '...'
```

Fuer jeden der 6 Scans ein separates UPDATE mit den korrekten Werten aus den bereitgestellten Daten.

| Datei | Aenderung |
|-------|-----------|
| Keine Code-Dateien | Nur Datenkorrektur in der Datenbank |

