
# Learning-Modul: Sidebar + bessere Formatierung

## 1. Topic-Sidebar (Desktop)

Statt der horizontalen Topic-Chips wird auf Desktop (ab 768px) eine vertikale Sidebar links angezeigt. Mobile bleibt bei den horizontalen Chips.

### Neue Komponente: `src/components/learning/TopicSidebar.tsx`

- Vertikale Liste aller Topics mit Emoji, Name und Nugget-Zaehler
- "Alle"-Eintrag oben mit Gesamtanzahl
- Aktives Topic wird hervorgehoben (bg-accent)
- "+" Button zum Erstellen neuer Topics
- Optionaler Loeschen-Button pro Topic (Icon, nur bei Hover sichtbar)
- Suchfeld unterhalb der Topic-Liste
- Kompakte, feste Breite (~220px)

### Layout-Aenderung: `src/pages/app/learning/LearningPage.tsx`

- Desktop: Zwei-Spalten-Layout mit `flex` -- Sidebar links (w-56, shrink-0), Nugget-Feed rechts (flex-1)
- Mobile: Einspaltiges Layout mit TopicChips horizontal oben (wie bisher)
- `useIsMobile()` Hook steuert welches Layout gerendert wird

## 2. Bessere Originaltext-Formatierung

### Aenderung: `src/components/learning/NuggetCard.tsx`

Der Originaltext wird aktuell als roher `whitespace-pre-wrap font-mono` Block gezeigt -- das sieht bei strukturiertem Text schlecht aus.

Neue Darstellung:
- Leerzeilen werden als Absatz-Trenner erkannt
- Zeilen die mit Aufzaehlungszeichen beginnen (-, *, >) werden als Liste gerendert
- Zeilen die kurz sind und mit Doppelpunkt enden werden als Zwischenueberschriften (fett) dargestellt
- Emojis und Sonderzeichen bleiben erhalten
- Statt `font-mono` wird `font-sans` mit `text-sm leading-relaxed` verwendet
- Behaelt `bg-muted/50 rounded-md p-4` fuer den Container

Neue Hilfsfunktion `formatOriginalText(text: string)` die den Rohtext in React-Elemente umwandelt:
- Splittet nach Doppel-Newlines in Absaetze
- Erkennt Listen-Zeilen (beginnend mit -, *, Zahl., >)
- Erkennt Ueberschriften-artige Zeilen (kurz, endet mit Doppelpunkt oder beginnt mit Emoji)
- Rendert entsprechende HTML-Elemente (`<p>`, `<ul>`, `<li>`, `<strong>`)

## 3. Bessere Nugget-Karten-Struktur

### Aenderung: `src/components/learning/NuggetCard.tsx`

Reihenfolge und Darstellung optimieren:

1. **Header**: Titel + Topic-Badge + Zeitstempel + Pin/Delete Buttons
2. **Zusammenfassung**: Direkt unter dem Titel, etwas groesser und prominenter (`text-sm` statt muted, mit leichtem Hintergrund)
3. **Kernpunkte**: Standardmaessig OFFEN (nicht zugeklappt) -- das ist der Hauptinhalt
4. **Tags**: Unterhalb der Kernpunkte
5. **Originaltext**: Aufklappbar ganz unten (bleibt Collapsible)

### Zusammenfassung-Styling
- Bekommt einen leichten Hintergrund (`bg-primary/5 rounded-md p-3`)
- Text in `text-sm leading-relaxed` statt `text-muted-foreground`
- Wirkt dadurch wie ein "Abstract" ueber dem Inhalt

## Technische Details

### Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/learning/TopicSidebar.tsx` | **Neu** -- Vertikale Topic-Navigation |
| `src/pages/app/learning/LearningPage.tsx` | Zwei-Spalten-Layout mit Sidebar (Desktop) vs. Chips (Mobile) |
| `src/components/learning/NuggetCard.tsx` | Formatierung Originaltext + Reihenfolge + Zusammenfassung prominent |

### formatOriginalText Logik (in NuggetCard.tsx)

```text
Input: Rohtext mit \n getrennt
1. Split nach \n\n -> Absaetze
2. Pro Absatz:
   a. Wenn alle Zeilen mit -, *, oder Zahl. beginnen -> <ul><li>...</li></ul>
   b. Wenn Zeile kurz (<80 Zeichen) und endet mit : -> <strong>Zeile</strong>
   c. Sonst -> <p>Zeile</p>
3. Emojis (z.B. ➡️) bleiben erhalten
```
