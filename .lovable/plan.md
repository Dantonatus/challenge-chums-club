

## PDF-Zeichensanitierung vervollstaendigen

### Gefundene Probleme

1. **Pfeile (U+2192 etc.)** werden komplett entfernt statt durch `->` ersetzt
   - Betroffen: Phase 2 "Beleg -> Position -> Artikel -> Kosten -> Bestand"
2. **Deutsches oeffnendes Anfuehrungszeichen** `"` (U+201E) wird nicht erkannt
   - Betroffen: Phase 3 `"Single Source of Truth"` → nur schliessendes `"` bleibt

### Aenderung

**Datei: `src/lib/planning/exportGanttPDF.ts`** – Funktion `sanitizeForPDF`

Zwei neue Ersetzungsregeln vor dem finalen Catch-all einfuegen:

```
.replace(/\u2192|\u2190|\u21D2/g, '->')  // Pfeile → ->
.replace(/\u201E/g, '"')                  // dt. unteres Anfuehrungszeichen „ → "
```

Keine weiteren Dateien betroffen. Reine Textersetzung, kein Layout-Einfluss.
