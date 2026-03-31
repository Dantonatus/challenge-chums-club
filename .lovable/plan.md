

## Fix: Dream Journal PDF Export — Designer-Qualitaet

### Identifizierte Probleme

1. **Unicode-Bruch**: jsPDF mit Helvetica (WinAnsi) kann keine Umlaute (ä, ö, ü), Emojis, Middot (·), Sterne (★☆) rendern — alles wird zu `�`
2. **Kein visuelles Design**: Keine Hintergrundfarbe, kein Header-Bar, kein Farbkonzept — nur schwarzer Text auf Weiss
3. **Keine Seitenzahlen/Footer**
4. **Kein Theme-Support** (Dark/Light wie bei BodyScan- und Weight-PDFs)
5. **Spacing/Layout** zu eng, keine visuelle Hierarchie

### Loesung: Kompletter Rewrite nach dem Premium-Pattern

Die bestehenden PDF-Exporte (BodyScan, Weight, Gantt) nutzen bereits ein Premium-Design mit Accent-Headerbar, Theme-Bg, Footer mit Seitenzahlen. Der Dream-Export wird nach diesem Muster neu geschrieben.

### Aenderungen in `src/lib/dreams/exportDreams.ts`

**Nur die `downloadPDF`-Funktion wird neu geschrieben. Markdown bleibt unveraendert.**

| Problem | Loesung |
|---|---|
| Unicode-Bruch (Umlaute, Emojis) | `sanitizeForPDF()` aus Gantt-Pattern: Umlaute bleiben (sind WinAnsi-kompatibel!), Emojis/Sterne/Middots werden durch ASCII-Alternativen ersetzt |
| Kein Header | Accent-farbiger Header-Bar (volle Breite, 22mm) mit "Traumtagebuch" Titel + Datumsrange rechts |
| Kein Theme | `getThemeBg()`, `getAccent()`, `getMuted()`, `getWhite()` — identisch zu BodyScan/Weight-PDFs |
| Kein Footer | Seitenzahlen + Erstellungsdatum auf jeder Seite |
| Mood-Emojis | Emojis entfernen, nur Text-Label anzeigen (z.B. "Froehlich" statt "😊 Fröhlich") |
| Vividness/Sleep | Numerisch "3/5" statt kaputte Stern-Symbole |
| Middot-Separator | Ersetzen durch " | " oder " - " |
| Fehlende Hierarchie | Datum-Gruppen mit subtiler Linie, Dream-Titel in Bold 12pt, Meta in Muted 9pt, Content in Normal 10pt mit leichtem Indent |
| Keine Seitenumbrueche pro Gruppe | `checkPage()` vor jeder Datumsgruppe mit genug Reserve |
| Luzid/Wiederkehrend Tags | Als kompakte Text-Labels in Klammern statt Badges |

### Visuelles Ergebnis

```text
┌──────────────────────────────────────┐
│ ████ Traumtagebuch    Mrz 2026 ████ │  ← Accent header bar
│                                      │
│ ─── 31. Maerz 2026 ─────────────── │  ← Date divider
│                                      │
│ Flug ueber die Stadt                │  ← Bold 12pt
│ Stimmung: Froehlich | Lebendigkeit: │  ← Muted 9pt
│ 4/5 | Schlaf: 3/5                   │
│ Luzid | Emotionen: Freude, Euphorie │
│ Tags: fliegen, stadt                │
│                                      │
│   Ich flog ueber die Daecher der    │  ← Content 10pt, indented
│   Stadt und konnte alles sehen...   │
│                                      │
│──────────────────────────────────────│
│ Erstellt am 31.03.2026  Seite 1/2   │  ← Footer
└──────────────────────────────────────┘
```

### Keine weiteren Dateien betroffen

Nur `src/lib/dreams/exportDreams.ts` wird geaendert. Die `downloadPDF`-Funktion + neue Helper-Funktionen (`sanitizeForPDF`, `getThemeBg`, etc.).

