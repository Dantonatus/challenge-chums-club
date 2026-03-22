

## Training Check-ins importieren (38 Einträge)

Die CSV-Datei enthält 38 Check-ins vom 02. Januar bis 22. März 2026, alle im "Black & White Fitness, Wellness, Health Worms". Das Format passt exakt zum bestehenden CSV-Parser.

### Umsetzung

Die Datei direkt per SQL in die `training_checkins`-Tabelle einfuegen. Die deutschen Datumsangaben werden manuell in ISO-Format konvertiert. Der `user_id` wird aus existierenden Eintraegen ermittelt.

```sql
INSERT INTO public.training_checkins (user_id, checkin_date, checkin_time, facility_name, facility_address)
SELECT (SELECT user_id FROM public.training_checkins LIMIT 1), d.checkin_date, d.checkin_time, d.facility_name, d.facility_address
FROM (VALUES
  ('2026-01-02','19:26:52','Black & White Fitness, Wellness, Health Worms','Alzeyer Straße 121'),
  ('2026-01-05','19:10:41', ...),
  -- ... alle 38 Zeilen
) AS d(checkin_date, checkin_time, facility_name, facility_address)
ON CONFLICT (user_id, checkin_date, checkin_time) DO NOTHING;
```

Keine Code-Aenderungen noetig. Die neuen Check-ins erscheinen nach Reload automatisch auf der Training-Seite.

