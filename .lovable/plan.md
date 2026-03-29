

## Traumtagebuch: Kalender-Navigation + Datumsauswahl

### Konzept

Ein kompakter Kalender-Strip in der Seite, der Tage mit Traum-Eintraegen markiert. Klick auf einen Tag filtert die Timeline und setzt das Datum fuer neue/bearbeitete Eintraege. Aehnlich wie der TrainingCalendar, aber kompakter und ins "Nocturnal"-Design integriert.

### Aenderungen

| Datei | Was |
|---|---|
| `src/components/dreams/DreamCalendar.tsx` | **Neu.** Kompakter Monats-Kalender (shadcn Calendar) im Glassmorphism-Card. Tage mit Eintraegen werden mit einem kleinen Punkt/Glow markiert. Klick auf Tag setzt `selectedDate`. Navigation per Monat. |
| `src/components/dreams/DreamCapture.tsx` | Props erweitern: `selectedDate?: Date`. Wenn gesetzt, wird `entry_date` auf diesen Tag gesetzt statt `CURRENT_DATE`. Zeigt das gewaehlte Datum als Chip neben dem Titel-Input an. Datepicker-Button zum manuellen Aendern (Popover + Calendar). |
| `src/pages/app/dreams/DreamJournalPage.tsx` | State `selectedDate: Date \| null` hinzufuegen. `DreamCalendar` zwischen Header und Capture rendern. Timeline nach `selectedDate` filtern (oder alle zeigen wenn null). `selectedDate` an `DreamCapture` weiterreichen. Layout: Kalender links, Capture+Timeline rechts auf Desktop (2-Spalten-Grid ab lg). |
| `src/components/dreams/DreamDetailSheet.tsx` | Edit-Modus ergaenzen: Button "Bearbeiten" oeffnet inline-Editing fuer Titel, Content, Mood, Tags etc. mit Save-Button. Nutzt `update` Mutation aus dem Hook. |
| `src/hooks/useDreamEntries.ts` | `update`-Mutation bereits vorhanden -- wird jetzt vom DetailSheet genutzt. |

### Layout (Desktop)

```text
┌────────────────────────────────────────────────┐
│  🌙 Traumtagebuch                              │
├──────────────┬─────────────────────────────────┤
│  ┌──────────┐│  ┌─ Quick Capture ──────────┐  │
│  │ Kalender ││  │ [22. Mrz 2026] Was hast..│  │
│  │ < Mrz  > ││  │ ...                      │  │
│  │ Mo Di Mi ││  └──────────────────────────┘  │
│  │  1  2  3 ││                                │
│  │  4● 5  6 ││  [Traeume] [Insights]          │
│  │  ...     ││  ┌────┐ ┌────┐ ┌────┐         │
│  └──────────┘│  │Card│ │Card│ │Card│         │
│              │  └────┘ └────┘ └────┘         │
└──────────────┴─────────────────────────────────┘
```

### Kalender-Markierungen

Tage mit Eintraegen bekommen einen kleinen farbigen Punkt unter der Zahl (via `modifiers` + `modifiersClassNames` der shadcn Calendar). Aktiv selektierter Tag wird hervorgehoben. "Heute" bleibt sichtbar.

### Detail-Sheet Edit

Bestehender Sheet bekommt einen "Bearbeiten"-Toggle. Im Edit-Modus werden Titel, Content, Mood, Vividness, Sleep, Toggles, Emotions und Tags editierbar (gleiche Komponenten wie DreamCapture). Save ruft `update.mutate()` auf.
