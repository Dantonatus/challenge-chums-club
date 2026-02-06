

# Detaillierte UX/UI-Fehleranalyse: Planungsansicht & Export

## Visuelles Audit – Identifizierte Probleme (Pixel-für-Pixel)

Ich habe sowohl den PNG-Export als auch den PDF-Export im Detail analysiert. Hier sind alle identifizierten Fehler aus Sicht eines anspruchsvollen Anwenders:

---

## KRITISCHE PROBLEME (Funktionalität beeinträchtigt)

### Problem 1: Label-Text wird ABGESCHNITTEN
**Schweregrad:** Kritisch | **Betroffene Elemente:** Alle Milestone-Labels

```
BEOBACHTUNG im PNG/PDF:
├─ "Datenanforderung CIO Wa..." (Wagon) – "Wacon" abgeschnitten
├─ "Kick-off & technische..." (Wein Wolf) – unvollständig
├─ "PoV - Deliver..." – fehlt "Delivery"
├─ "Regelmäßige Ahstimmung" – TIPPFEHLER "Abstimmung" → "Ahstimmung"
├─ "Vor-Ort-Workshon" – TIPPFEHLER "Workshop" → "Workshon"
└─ "Deadine PoV" – TIPPFEHLER "Deadline" → "Deadine"
```

**Root Cause:** 
- `maxWidth: 140px` mit `WebkitLineClamp: 2` schneidet Text ab
- Die 2-Zeilen-Begrenzung reicht für lange deutsche Texte nicht aus

**Fix:**
- `maxWidth` auf **160px** erhöhen
- Alternative: Tooltip bei Hover mit vollem Text

---

### Problem 2: Label-ÜBERLAPPUNG bei nahen Meilensteinen
**Schweregrad:** Kritisch | **Position:** Wagon-Zeile (5. Feb & 27. Feb)

```
BEOBACHTUNG:
├─ "5. Feb. Datenanforderung" und "27. Feb. PoV -" überlappen HORIZONTAL
├─ Beide Labels sind "above" positioniert (kein Stagger ausgelöst)
└─ Abstand ~22 Tage bei 180 Tagen = 12.2% → knapp über 15%-Threshold
```

**Root Cause:**
- `MIN_LABEL_DISTANCE_PERCENT = 15%` greift nicht, weil Abstand 22/180 = ~12.2% ist
- WAIT – das ist UNTER 15%, also SOLLTE Stagger greifen!
- **Echter Bug:** Die Stagger-Logik funktioniert, aber die Labels sind zu BREIT (140px + 80px Mindestbreite)

**Fix:**
- Dynamischen Stagger-Threshold basierend auf tatsächlicher Label-Breite berechnen
- ODER: Threshold auf **18%** erhöhen für 6-Monats-Ansicht

---

### Problem 3: Verbindungslinien sind FAST UNSICHTBAR
**Schweregrad:** Mittel | **Betroffene Elemente:** Alle Label-zu-Icon-Linien

```
BEOBACHTUNG im PNG/PDF:
├─ Verbindungslinien zwischen Label und Icon sind kaum sichtbar
├─ Farbe rgba(100,100,100,0.4) ist zu hell auf weißem Hintergrund
└─ Linienstärke 1px ist bei 2x-Export zu dünn
```

**Root Cause:**
- `w-px` = 1px ist bei Retina-Export nur 0.5 "visuelle Pixel"
- Opacity 0.4 ist zu transparent

**Fix:**
- Linienstärke auf `w-0.5` (2px) erhöhen
- Farbe auf `rgba(80, 80, 80, 0.6)` verstärken

---

## DESIGN-PROBLEME (Ästhetik & Professionalität)

### Problem 4: Kunden-Namen werden abgeschnitten
**Schweregrad:** Mittel | **Position:** Linke Spalte

```
BEOBACHTUNG:
├─ "Wein Wolf" ist vollständig
├─ "Sensoplast" wird zu "Sensonlast" (OCR-Fehler oder Font-Rendering)
├─ Bei längeren Namen würde "truncate" greifen
└─ Spaltenbreite 140px ist knapp
```

**Root Cause:**
- `max-w-[100px]` in ClientBadge bei `compact=true`
- Kombiniert mit Font-Rendering kann Text unleserlich werden

**Fix:**
- `max-w-[120px]` für kompakte Badges
- Oder Spaltenbreite auf **160px** erhöhen

---

### Problem 5: Inkonsistente Label-Höhen bei BELOW-Position
**Schweregrad:** Mittel | **Position:** Labels unter der Timeline

```
BEOBACHTUNG:
├─ "16. Apr. Vor-Ort-Workshop" hat 3 Zeilen
├─ "30. Apr. PoV-Ende" hat 2 Zeilen
└─ Unterschiedliche vertikale Positionen wirken unruhig
```

**Root Cause:**
- `minHeight: 24px` reicht nicht für einheitliche Höhe
- Wenn Text 3 Zeilen braucht, verschiebt sich alles

**Fix:**
- Feste Höhe `height: 36px` für Label-Container
- `overflow: hidden` statt `line-clamp` für striktere Kontrolle

---

### Problem 6: Monats-Header-Rendering im Export
**Schweregrad:** Niedrig | **Position:** Header-Zeile

```
BEOBACHTUNG im PDF:
├─ Monatsnamen sind korrekt: Jan. Feb. März Apr. Mai Juni
├─ ABER: "Kunden"-Label in erster Spalte ist sehr klein/dünn
└─ Schriftgröße wirkt im PDF kleiner als im Browser
```

**Root Cause:**
- Font-Size `text-xs` (12px) wird bei html2canvas manchmal inkorrekt erfasst
- Browser-Font und Export-Font können unterschiedlich rendern

**Fix:**
- Explizite `fontSize: 12px` als Inline-Style im Export-Kontext
- Font-Weight explizit setzen für Konsistenz

---

### Problem 7: "Heute"-Linie (Today-Indicator) Position
**Schweregrad:** Niedrig | **Betroffene Komponente:** TodayLine

```
BEOBACHTUNG:
├─ Die grüne vertikale Linie für "Heute" ist korrekt positioniert
├─ ABER: Der pulsierende Punkt oben ist im Export statisch (kein animate-pulse)
└─ Der Punkt wirkt im Export wie ein Fehler, da er "schwebt"
```

**Root Cause:**
- CSS-Animationen werden von html2canvas nicht erfasst
- Der Punkt sollte im Export anders gestyled werden

**Fix:**
- Animation nur im Browser, nicht im Export-Clone anzeigen
- Oder: Punkt größer machen und als Dreieck/Pfeil gestalten

---

### Problem 8: Period-Bar Ecken bei Extend-Beyond-View
**Schweregrad:** Niedrig | **Position:** Sensoplast-Zeile

```
BEOBACHTUNG:
├─ Sensoplast-Bar beginnt am linken Rand (startsBeforeView)
├─ Die linke Ecke ist korrekt "eckig" (rounded-l-none)
├─ Der Fade-Gradient ist kaum sichtbar (nur bei genauem Hinsehen)
```

**Root Cause:**
- `${client.color}40` ist zu subtil
- Gradient von 40% auf transparent ist zu sanft

**Fix:**
- Stärkerer Gradient: `${client.color}60` auf transparent
- Oder: Dezentes Chevron-Icon am Rand als visueller Hinweis

---

### Problem 9: PDF-Skalierung nicht optimal
**Schweregrad:** Mittel | **Format:** PDF-Export

```
BEOBACHTUNG:
├─ Chart nutzt nicht die volle Seitenbreite
├─ Viel Leerraum links und rechts
├─ Header "Projektplanung H1 2026" ist redundant (bereits im Dateinamen)
```

**Root Cause:**
- `margin = 8mm` beidseitig = 16mm weniger
- Chart wird proportional skaliert, nicht auf Breite optimiert

**Fix:**
- Margins auf **5mm** reduzieren
- Chart auf volle `contentWidth` strecken (Aspect-Ratio anpassen)

---

### Problem 10: Farbige Client-Dots zu klein im Export
**Schweregrad:** Niedrig | **Position:** Linke Spalte

```
BEOBACHTUNG:
├─ Die farbigen Punkte vor Kundennamen sind sehr klein (2x2px bei compact)
├─ Farben sind schwer zu unterscheiden bei ähnlichen Tönen
└─ Punkte sollten prominenter sein für schnelles Scannen
```

**Root Cause:**
- `w-2 h-2` (8px) ist bei Print/Export grenzwertig

**Fix:**
- Auf `w-2.5 h-2.5` (10px) erhöhen
- Alternativ: Farbigen Left-Border nutzen (wie bereits vorhanden, aber dicker)

---

## VERBESSERUNGS-POTENZIALE

### Enhancement 1: Stagger-Logik verbessern

**Aktuell:**
```typescript
const MIN_LABEL_DISTANCE_PERCENT = 15;
const needsStagger = distance < MIN_LABEL_DISTANCE_PERCENT;
```

**Besser:**
```typescript
// Dynamischer Threshold basierend auf Label-Breite
const estimatedLabelWidthPercent = 12; // ~140px bei 1200px Breite ≈ 12%
const MIN_LABEL_DISTANCE_PERCENT = estimatedLabelWidthPercent + 5; // Buffer

// Zusätzlich: Titel-Länge berücksichtigen
const titleIsLong = milestone.title.length > 15;
const adjustedThreshold = titleIsLong ? MIN_LABEL_DISTANCE_PERCENT + 3 : MIN_LABEL_DISTANCE_PERCENT;
```

---

### Enhancement 2: Export-Vorschau

**Feature:** Vor dem Export eine Vorschau anzeigen
- Modal mit verkleinerter Ansicht des Exports
- Hinweis wenn Labels überlappen
- Option "Ohne Labels" für saubereren Export

---

### Enhancement 3: Responsive Label-Sizing

**Feature:** Label-Größe an verfügbaren Platz anpassen
- Bei wenig Meilensteinen: größere Labels, mehr Text
- Bei vielen Meilensteinen: kompaktere Labels, mehr Stagger

---

## Implementierungs-Plan

### Phase 1: Kritische Fixes (Sofort)

| Datei | Änderung |
|-------|----------|
| `ClientPeriodBar.tsx` | Label maxWidth 160px, Linienfarbe verstärken, Threshold 18% |
| `ClientBadge.tsx` | max-w-[120px] statt 100px bei compact |
| `exportCanvas.ts` | Margins 5mm, bessere Font-Fixes |

### Phase 2: Design-Polish

| Datei | Änderung |
|-------|----------|
| `ClientPeriodBar.tsx` | Feste Label-Höhe 36px, Linie 2px |
| `HalfYearCalendar.tsx` | Spaltenbreite 160px |
| `TodayLine` | Export-spezifisches Styling (kein Pulse) |

### Phase 3: Enhancements

| Feature | Beschreibung |
|---------|-------------|
| Export-Vorschau | Preview-Modal vor Download |
| Dynamisches Stagger | Titel-Länge berücksichtigen |
| "Ohne Labels" Option | Checkbox im Export-Dialog |

---

## Code-Änderungen (Detailliert)

### 1. ClientPeriodBar.tsx

```typescript
// Zeile 41: Threshold erhöhen
const MIN_LABEL_DISTANCE_PERCENT = 18; // War: 15

// Zeile 205-208: Linie verstärken
<div 
  className="order-last w-0.5 h-4" 
  style={{ backgroundColor: 'rgba(80, 80, 80, 0.6)' }} 
/>

// Zeile 218: Label breiter
style={{ maxWidth: '160px', minWidth: '90px' }}

// Zeile 223-233: Feste Höhe für Konsistenz
<div 
  className="text-[10px] text-muted-foreground leading-snug"
  style={{ 
    height: '32px', // Feste Höhe für 2-3 Zeilen
    overflow: 'hidden',
    wordBreak: 'break-word',
  }}
>
```

### 2. ClientBadge.tsx

```typescript
// Zeile 39: Mehr Platz für Namen
compact && "text-xs max-w-[120px]" // War: 100px
```

### 3. HalfYearCalendar.tsx

```typescript
// Zeile 47: Breitere Kundenspalte
className="grid grid-cols-[160px_1fr]" // War: 140px
```

### 4. exportCanvas.ts

```typescript
// Zeile 122: Kleinere Margins
const margin = 5; // War: 8

// Zeile 123-124: Mehr Platz für Content
const headerHeight = 12;
const footerHeight = 6;
```

---

## Erwartetes Ergebnis

Nach Implementierung aller Fixes:

1. **Labels**: Vollständig lesbar, keine Überlappung
2. **Linien**: Klar sichtbar (2px, 60% Opacity)
3. **Stagger**: Greift früher (18% Threshold)
4. **PDF**: Maximale Chartgröße durch reduzierte Margins
5. **Konsistenz**: Einheitliche Label-Höhen

