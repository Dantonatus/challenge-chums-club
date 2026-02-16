

# Mathematische Berechnungen in die KPI-Karten-Icons

## Ziel

Jede der 6 KPI-Karten im Gewichtsbereich bekommt ein kleines Info-Icon (wie bei den Trend-Buttons im Chart), das per Popover die mathematische Berechnung erklaert.

## Aenderung: `src/components/weight/WeightKPICards.tsx`

### Neue Imports
- `Popover, PopoverContent, PopoverTrigger` aus `@/components/ui/popover`
- `Info` aus `lucide-react`

### Datenstruktur erweitern

Jede Karte bekommt ein neues Feld `calc` mit Titel, Erklaerung und Formel:

| Karte | Titel | Formel |
|---|---|---|
| **Aktuell** | Letzter Eintrag + Wochenvergleich | Differenz zum naechstgelegenen Eintrag vor ~7 Tagen. Naechster Eintrag wird ueber minimale Zeitdifferenz bestimmt. |
| **Trend (Oe7)** | Gleitender Durchschnitt 7 Tage | Summe(Gewicht[i-6..i]) / Anzahl. Richtung: Differenz der letzten 3 MA-Werte, Schwelle +-0.3 kg. |
| **Volatilitaet** | Standardabweichung (14 Tage) | sigma = sqrt( Summe((y - mean)^2) / n ), letzte 14 Eintraege. |
| **Tiefster Wert** | Minimum aller Eintraege | Einfacher linearer Scan: min(weight_kg) ueber alle Eintraege. |
| **Hoechster Wert** | Maximum aller Eintraege | Einfacher linearer Scan: max(weight_kg) ueber alle Eintraege. |
| **Monatl. Schnitt** | Durchschnitt des aktuellen Monats | Summe(weight_kg fuer YYYY-MM) / Anzahl. Vergleich zum Vormonat analog berechnet. |

### UI-Umsetzung

- Neben dem Label-Text (z.B. "Aktuell") wird ein kleines `<Info size={12} />` Icon platziert
- Klick oeffnet ein `Popover` mit:
  - **Titel** (fett)
  - **Erklaerung** (text-xs, muted)
  - **Formel** (font-mono, bg-muted/50, rounded)
- Gleiches Design wie bei den bestehenden Trend-Button-Popovers im WeightTerrainChart

### Technische Details

- Die `cards`-Array-Definition wird um ein `calc`-Objekt pro Karte erweitert: `{ title: string; text: string; formula: string }`
- Im Render-Loop wird nach dem Label-Span ein `Popover` mit `Info`-Icon eingefuegt
- Keine neuen Abhaengigkeiten noetig
