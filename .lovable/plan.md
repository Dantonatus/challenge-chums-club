

## Fix: Kalender verschwindet bei H2 + Rolling 6-Monats-Fenster

### Problem 1: Kein Kalender bei H2 2026

`useMilestonesByClient` gruppiert nur Meilensteine -- Kunden ohne Meilensteine im Zeitraum fehlen in `byClient`. Die `HalfYearCalendar` prueft `if (clientData.length === 0) return null` und zeigt nichts an. Gleichzeitig greift die `PlanningEmptyState` nicht, weil `clients.length > 0`.

**Fix**: In `PlanningPage.tsx` alle aktiven Kunden in `byClient` einmischen (auch solche ohne Meilensteine im Zeitraum), damit die Zeilen immer sichtbar sind. Alternativ: Wenn `byClient` leer aber `clients` vorhanden, den leeren Kalender mit Kundenzeilen anzeigen.

### Problem 2: Starre H1/H2-Aufteilung ersetzen durch rollierendes 6-Monats-Fenster

Statt `HalfYear { year, half: 1|2 }` wird ein neues Modell `SixMonthWindow { year: number; startMonth: number }` eingefuehrt. Der User waehlt per Monats-Picker den Startmonat und sieht dann 6 aufeinanderfolgende Monate (z.B. Maerz 2026 bis August 2026).

### Aenderungen

| Datei | Was |
|---|---|
| `src/lib/planning/types.ts` | `ViewMode` aendern: `'halfyear'` wird zu `'6month'`. Neuer Typ `SixMonthWindow { year: number; startMonth: number }`. Neue Hilfsfunktionen (`getSixMonthRange`, `getSixMonthMonths`, Navigation prev/next um 1 Monat). `HalfYear`-Typ und Funktionen entfernen. |
| `src/hooks/useMilestones.ts` | `halfYear`-Option durch `sixMonth: SixMonthWindow` ersetzen. Datumsfilter auf `getSixMonthRange` umstellen. |
| `src/pages/app/planning/PlanningPage.tsx` | State `halfYear` → `sixMonth`. Kunden ohne Meilensteine in `byClient` ergaenzen. ViewMode-Handling anpassen. |
| `src/components/planning/QuarterHeader.tsx` | Navigation: Prev/Next verschiebt Startmonat um 1 Monat. Label zeigt "Mrz – Aug 2026". Monats-Auswahl-Dropdown optional. |
| `src/components/planning/HalfYearCalendar.tsx` | Umbenennen/Refactoren zu `SixMonthCalendar`. Props von `HalfYear` auf `SixMonthWindow` umstellen. Dynamisch 6 Spalten basierend auf `startMonth`. TodayLine entsprechend anpassen. |
| `src/components/planning/ViewModeToggle.tsx` | Label "Halbjahr" → "6 Monate", Value `'halfyear'` → `'6month'`. |

### Navigation-Verhalten

- **Prev/Next**: Verschiebt den Startmonat um 1 Monat (statt starr H1↔H2)
- **Heute-Button**: Setzt Startmonat auf aktuellen Monat
- **Label**: Zeigt z.B. "Mrz – Aug 2026"
- Jahresuebergaenge funktionieren automatisch (z.B. Nov 2026 → Apr 2027)

### Kunden immer sichtbar

In `PlanningPage` werden alle aktiven Kunden aus `useClients()` mit den gefilterten Meilensteinen gemergt, sodass auch Kunden ohne Meilensteine im Zeitraum als leere Zeilen erscheinen.

