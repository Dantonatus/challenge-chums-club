
## Schriftart im Gantt-PDF auf PDF-Standard umstellen

### Problem
jsPDF nutzt aktuell die eingebaute **Helvetica** (eine der 14 Standard-PDF-Fonts). Diese unterstützt zwar deutsche Umlaute (ä, ö, ü, ß), hat aber Probleme mit einigen Unicode-Zeichen wie dem Haken "✓", dem Gedankenstrich "–" oder Aufzählungszeichen "•", was zu Zeichenbruechen im PDF fuehrt.

### Loesung
Die eingebaute Helvetica beibehalten (ist der gaengigste PDF-Font), aber alle problematischen Sonderzeichen durch PDF-sichere Alternativen ersetzen:

- `✓` → normaler Text oder einfacher Strich
- `–` (Em/En-Dash) → `-` (Bindestrich)
- `•` (Bullet) → `-`
- Sonstige Unicode-Zeichen sanitizen

### Technische Aenderungen

**Datei: `src/lib/planning/exportGanttPDF.ts`**

1. Neue Hilfsfunktion `sanitizeForPDF(text)` erstellen, die alle nicht-WinAnsi-Zeichen ersetzt
2. Alle `doc.text(...)` Aufrufe durch die sanitize-Funktion absichern
3. Das Haken-Zeichen "✓" (Zeile 259) durch ein gezeichnetes Haekchen oder "x" ersetzen
4. In `htmlToPlainLines`: Bullet-Zeichen (•, –) auf sichere Zeichen normalisieren
5. In `decodeEntities`: zusaetzliche Sonderzeichen abfangen
