

# Fix: Label-Überlappung durch größere Zeilenhöhe und intelligenteres Stagger-System

## Problem-Analyse (aus dem Screenshot)

### Wagon-Zeile: 5. Feb & 27. Feb
- "5. Feb. Datenanforderung CIO" und "27. Feb. PoV - Delivery" überlappen stark
- Beide Labels sind "above" positioniert (keine Stagger-Logik greift, weil Abstand > 6%)
- Die Labels laufen horizontal ineinander

### Wein Wolf: 2. März, 27. März, 16. Apr, 22. Mai
- 4 Meilensteine in einer Reihe
- Horizontale Überlappung bei nahen Meilensteinen

### Root Causes

1. **`MIN_LABEL_DISTANCE_PERCENT = 6%`** ist für 6-Monats-Ansicht viel zu klein
   - Bei 6 Monaten = 180 Tage → 6% = nur ~10 Tage Abstand erforderlich
   - "5. Feb" und "27. Feb" sind 22 Tage auseinander → kein Stagger ausgelöst!
   
2. **`ROW_HEIGHT_EXPANDED = 120px`** reicht nicht für gestaffelte Labels
   - Labels brauchen je ~40px (2 Zeilen + Linie)
   - Mit Stagger above/below → 80px + Bar 40px = 120px → am Limit

3. **`whitespace-nowrap`** bei Labels verhindert Umbruch
   - Lange Titel wie "Datenanforderung CIO VPP" laufen horizontal über

## Lösungsarchitektur

### Strategie: "Room to Breathe"

```
AKTUELL (120px mit 6% Threshold):
┌─────────────────────────────────────────────────────┐
│         5. Feb. Datenanf...  27. Feb. PoV - Del...  │ ← Überlappung!
│            ●────────────────────●                   │
└─────────────────────────────────────────────────────┘

NEU (160px mit 12% Threshold + 2-Zeilen-Wrap):
┌─────────────────────────────────────────────────────┐
│     5. Feb.              27. Feb.                   │
│     Datenanforderung     PoV - Delivery             │ ← Getrennt
│     CIO VPP                                         │
│            ●────────────────────●                   │
│                                                     │ ← Mehr Raum
└─────────────────────────────────────────────────────┘
```

## Konkrete Änderungen

### 1. Zeilenhöhe erhöhen

| Konstante | Aktuell | Neu |
|-----------|---------|-----|
| `ROW_HEIGHT_COMPACT` | 80px | 80px (unverändert) |
| `ROW_HEIGHT_EXPANDED` | 120px | **160px** |

→ 40px mehr Platz für gestaffelte Labels

### 2. Stagger-Threshold für 6-Monats-Ansicht anpassen

| Konstante | Aktuell | Neu |
|-----------|---------|-----|
| `MIN_LABEL_DISTANCE_PERCENT` | 6% | **12%** |

→ Bei 6 Monaten (180 Tage) = ~22 Tage Mindestabstand für Stagger

### 3. Labels 2-zeilig mit intelligentem Wrap

```tsx
// AKTUELL:
<div className="whitespace-nowrap" style={{ maxWidth: '120px' }}>

// NEU:
<div className="whitespace-normal text-center" style={{ maxWidth: '100px' }}>
```

→ Labels umbrechen bei Bedarf statt zu überlappen

### 4. Label-Styling für bessere Trennung

```tsx
// Datum bleibt auf einer Zeile
<div className="text-[11px] font-bold text-foreground whitespace-nowrap">
  {formatDateCompact(new Date(milestone.date))}
</div>

// Titel umbricht auf 2 Zeilen
<div className="text-[10px] text-muted-foreground line-clamp-2 leading-snug">
  {milestone.title}
</div>
```

## Dateien & Änderungen

### Datei 1: `ClientPeriodBar.tsx`

**Zeile 41:** `MIN_LABEL_DISTANCE_PERCENT` von 6 auf **12** erhöhen

**Zeile 212-227:** Label-Container-Styling anpassen:
- `whitespace-nowrap` → `whitespace-normal` (für Titel)
- `maxWidth: '120px'` → `maxWidth: '100px'` (kompaktere Labels)
- Datum: `whitespace-nowrap` behalten
- Titel: `line-clamp-2` + `leading-snug`

### Datei 2: `HalfYearCalendar.tsx`

**Zeile 22:** `ROW_HEIGHT_EXPANDED` von 120 auf **160** erhöhen

### Datei 3: `QuarterCalendar.tsx`

**Zeile 22:** `ROW_HEIGHT_EXPANDED` von 120 auf **160** erhöhen (Konsistenz)

## Erwartetes Ergebnis

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Zeilenhöhe (Labels an) | 120px | 160px |
| Stagger-Mindestabstand | 6% (~10 Tage) | 12% (~22 Tage) |
| Label-Breite max | 120px | 100px |
| Titel-Umbruch | `whitespace-nowrap` | 2-zeilig mit wrap |

Das Ergebnis: **Keine Überlappungen mehr**, auch bei eng beieinanderliegenden Meilensteinen, weil:
1. Das Stagger-System früher greift (12% statt 6%)
2. Mehr vertikaler Raum für above/below Labels (160px)
3. Labels umbrechen statt horizontal zu überlappen

