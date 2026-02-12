

# PDF-Export: HTML-Entities korrekt dekodieren

## Problem

Der HTML-Parser in `htmlToPlainLines` gibt HTML-Entities wie `&amp;`, `&nbsp;`, `&lt;`, `&gt;` als Rohtext an jsPDF weiter, statt sie in die entsprechenden Zeichen umzuwandeln. Dadurch steht im PDF z.B. `&amp;` statt `&` und `&nbsp;` statt einem Leerzeichen.

## Loesung

### Datei: `src/lib/planning/exportGanttPDF.ts`

Eine `decodeEntities`-Hilfsfunktion hinzufuegen, die gaengige HTML-Entities ersetzt:

- `&amp;` wird zu `&`
- `&nbsp;` wird zu ` ` (normales Leerzeichen)
- `&lt;` wird zu `<`
- `&gt;` wird zu `>`
- `&quot;` wird zu `"`
- `&#39;` / `&apos;` wird zu `'`
- Numerische Entities wie `&#123;` werden ebenfalls dekodiert

Diese Funktion wird an zwei Stellen angewendet:

1. In `flushText()` -- bevor der Text in die `lines`-Liste gepusht wird, wird `decodeEntities` auf den Text angewendet
2. Im Plain-Text-Pfad (Zeile 35-39) -- ebenfalls Entity-Dekodierung auf jede Zeile anwenden

Dadurch wird der PDF-Text identisch zur On-Screen-Darstellung gerendert.

## Technische Details

```text
Neue Hilfsfunktion:
  decodeEntities(text: string): string
    - Ersetzt benannte Entities (&amp; &nbsp; &lt; &gt; &quot; &apos;)
    - Ersetzt numerische Entities (&#60; &#x3C;)
    - Entfernt doppelte Leerzeichen die durch &nbsp; entstehen

Aenderungen in htmlToPlainLines():
  - flushText(): line 66 -> decodeEntities(t) anwenden
  - Plain-text Pfad: line 38 -> decodeEntities(trimmed) anwenden
```

