

## Traumtagebuch: Export (MD + PDF) + Gesamtansicht

### Neue Features

#### 1. Export-Funktion (Markdown + PDF)

**Neue Datei: `src/lib/dreams/exportDreams.ts`**
- `exportDreamsMarkdown(entries: DreamEntry[]): string` — Generiert ein sauber strukturiertes Markdown-Dokument:
  ```
  # Traumtagebuch
  Exportiert am 31. Maerz 2026 · 42 Traeume

  ---

  ## 15. Maerz 2026

  ### Flug ueber die Stadt 🌙
  **Stimmung:** 😊 Froehlich · **Lebendigkeit:** ★★★★☆ · **Schlaf:** ★★★☆☆
  **Luzid:** Ja · **Wiederkehrend:** Nein
  **Emotionen:** Freude, Euphorie
  **Tags:** fliegen, stadt

  > Ich flog ueber die Daecher der Stadt und konnte alles sehen...

  ---
  ```
- `downloadMarkdown(entries)` — Erstellt Blob + triggert Download als `.md`
- `downloadPDF(entries)` — Nutzt jsPDF (bereits im Projekt) mit gleichem Content, sauber formatiert auf A4 mit Seitenumbruechen pro Tag, Titel-Header, Mood-Emojis, Metadata-Zeile

**Neue Datei: `src/components/dreams/DreamExportMenu.tsx`**
- Dropdown-Button (lucide `Download`-Icon) mit zwei Optionen: "Als Markdown" / "Als PDF"
- Wird in der Page-Header-Zeile neben dem Titel platziert
- Exportiert immer ALLE Eintraege (nicht gefiltert), mit Hinweis im Tooltip

#### 2. Gesamtansicht aller Traeume

**Neuer Tab "Alle" in den bestehenden Tabs**

| Element | Beschreibung |
|---|---|
| Neuer Tab `all` | Dritter Tab neben "Traeume" und "Insights" mit Icon `List` und Label "Alle" |
| Tabellarische Liste | Kompakte Tabelle (shadcn Table) mit Spalten: Datum, Titel, Stimmung (Emoji), Lebendigkeit (Dots), Luzid (Badge), Tags |
| Sortierung | Default nach Datum absteigend, Klick auf Spaltenheader zum Umkehren |
| Klick-Aktion | Zeile klickbar → oeffnet DreamDetailSheet (gleich wie bei Cards) |
| Alle Eintraege | Zeigt IMMER alle entries (ignoriert Kalender-Filter), damit man die komplette Sammlung ueberblicken kann |

**Neue Datei: `src/components/dreams/DreamAllView.tsx`**
- Nutzt shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- Responsive: Auf Mobile werden Tags und Lebendigkeit ausgeblendet
- Glassmorphism-Card als Wrapper (konsistent mit restlichem Design)
- Count-Badge im Tab-Trigger: "Alle (42)"

### Aenderungen an bestehenden Dateien

| Datei | Aenderung |
|---|---|
| `DreamJournalPage.tsx` | Export-Button im Header einfuegen; dritten Tab "Alle" mit `DreamAllView` hinzufuegen |
| `src/lib/dreams/types.ts` | Keine Aenderung noetig |

### Technische Details

- **jsPDF** ist bereits installiert (wird in `exportGanttPDF.ts` etc. verwendet)
- **Markdown-Export**: Reiner String-Builder, kein externer Dependency noetig
- **PDF-Layout**: A4 Hochformat, Serifen-Font fuer Titel, Gruppenumbruch pro Datum, Mood-Emojis als Unicode
- **Sortierung in Gesamtansicht**: Lokaler React-State `sortDir: 'asc' | 'desc'`, Toggle per Klick auf Datum-Header

