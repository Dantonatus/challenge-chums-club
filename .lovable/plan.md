

## Body-Scan-Eintrag manuell einfuegen

### Daten aus dem Text

| Feld | Wert |
|---|---|
| Datum | 2026-03-22 |
| Uhrzeit | 13:14 |
| Gewicht | 94.0 kg |
| Koerperfett | 20.8 % / 19.5 kg |
| Muskelmasse | 70.7 kg |
| Koerperwasser | 55.4 % / 52.1 kg |
| Viszeralfett | 6 |
| Segment Fett | Rumpf 22.2%, Arm L 18.1%, Arm R 16.9%, Bein L 19.9%, Bein R 20.1% |
| Segment Muskel | Rumpf 38.9kg, Arm L 4.3kg, Arm R 4.3kg, Bein L 11.6kg, Bein R 11.6kg |

Felder ohne Daten (werden NULL): age_years, height_cm, bone_mass_kg, bmi, metabolic_age, ecw_kg, icw_kg, ecw_tbw_ratio, bmr_kcal, physique_text

### Umsetzung

Einen SQL-Insert ueber das Migrations-Tool ausfuehren. Der `user_id` wird dynamisch ueber `auth.uid()` nicht moeglich (Migration laeuft serverseitig), daher wird zuerst die user_id aus der `body_scans`-Tabelle ermittelt (existierender User mit vorhandenen Scans) und dann der Insert ausgefuehrt.

```sql
INSERT INTO public.body_scans (
  user_id, scan_date, scan_time, device,
  weight_kg, fat_percent, fat_mass_kg, muscle_mass_kg,
  tbw_kg, tbw_percent, visceral_fat, segments_json
) VALUES (
  (SELECT user_id FROM public.body_scans LIMIT 1),
  '2026-03-22', '13:14', 'TANITA MC-780',
  94.0, 20.8, 19.5, 70.7,
  52.1, 55.4, 6,
  '{"muscle":{"trunk":38.9,"armL":4.3,"armR":4.3,"legL":11.6,"legR":11.6},"fat":{"trunk":22.2,"armL":18.1,"armR":16.9,"legL":19.9,"legR":20.1}}'::jsonb
);
```

Keine Code-Aenderungen noetig -- der neue Eintrag erscheint automatisch in der Body-Scan-Ansicht nach dem naechsten Laden.

