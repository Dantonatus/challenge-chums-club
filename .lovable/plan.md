

## Body Scan KPIs: Alle Analyseergebnis-Werte anzeigen

### Ziel
Alle Werte aus dem TANITA-Bericht (Bild) sollen als KPI-Karten oben auf der Body Scan Page erscheinen — aber nur wenn der jeweilige Wert im ausgewaehlten Scan vorhanden ist.

### Fehlende Werte im Vergleich (Bild vs. aktuelle KPIs)

| Wert | Aktuell in KPIs? | In DB? |
|---|---|---|
| Gewicht | Ja | Ja |
| Fettanteil | Ja | Ja |
| **Fettmasse** | Nein | Ja (`fat_mass_kg`) |
| **Fettfreie Masse** | Nein | Berechenbar (`weight - fat_mass`) |
| Muskelmasse | Ja | Ja |
| **Skelett-Muskelmasse** | Nein | **Nein** — neue Spalte noetig |
| Viszeralfett | Ja | Ja |
| BMI | Ja | Ja |
| Stoffwechselalter | Ja | Ja |
| **BMR (Grundumsatz)** | Nein (nur in MetabolismCard) | Ja (`bmr_kcal`) |

### Aenderungen

#### 1. DB Migration: Neue Spalte `skeletal_muscle_mass_kg`
```sql
ALTER TABLE body_scans ADD COLUMN skeletal_muscle_mass_kg NUMERIC;
```
Update des April-10-Eintrags mit dem Wert `45.7`.

#### 2. Types erweitern
`src/lib/bodyscan/types.ts`: `skeletal_muscle_mass_kg: number | null` in `BodyScan` und `ParsedBodyScan` hinzufuegen.

#### 3. KPI Cards erweitern (`src/components/bodyscan/BodyScanKPICards.tsx`)
Alle Werte als KPI-Karten definieren, aber mit `.filter()` nur diejenigen rendern, bei denen `value !== '–'`. Neue KPIs:
- **Fettmasse** (`fat_mass_kg`, Icon: Percent)
- **Fettfreie Masse** (berechnet: `weight_kg - fat_mass_kg`, Icon: Dumbbell)
- **Skelett-Muskelmasse** (`skeletal_muscle_mass_kg`, Icon: Dumbbell)
- **BMR** (`bmr_kcal`, Icon: Flame)

Grid wird responsiv: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` (statt 6), da die Anzahl dynamisch variiert.

#### 4. Edge Function Prompt erweitern
`skeletal_muscle_mass_kg` zum erwarteten JSON-Schema in `parse-bodyscan-pdf` hinzufuegen, damit zukuenftige Imports den Wert automatisch extrahieren.

#### 5. Import-Hook anpassen
`useBodyScans.ts`: Neues Feld im Row-Mapping beruecksichtigen.

### Keine Idealwerte
Idealwerte werden bewusst nicht angezeigt (wie gewuenscht).

