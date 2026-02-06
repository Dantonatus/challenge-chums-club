

# Fix: Label-Überschneidung mit Today-Line + Größere Zeilenhöhe

## Problem-Analyse

Nach Sichtung des Screenshots und Codes identifiziere ich drei konkrete Issues:

1. **Today-Line Überlappung**: Die vertikale grüne "Heute"-Linie (`z-10`) liegt über den Labels (`z-20`), aber visuell kollidieren sie trotzdem weil beide im gleichen Bereich sind
2. **Zu geringer Label-Abstand**: `mb-0.5` (2px) und die winzige Verbindungslinie `h-1` (4px) lassen Labels fast am Icon kleben
3. **Zeilenhöhe zu knapp**: Bei `ROW_HEIGHT_EXPANDED = 100px` ist nicht genug Platz für 2-zeilige Labels + Stagger

## Lösung

### 1. Größere Zeilenhöhe für mehr Breathing Room

```text
Aktuell:
ROW_HEIGHT_COMPACT = 80px
ROW_HEIGHT_EXPANDED = 100px

Neu:
ROW_HEIGHT_COMPACT = 80px (unverändert)
ROW_HEIGHT_EXPANDED = 120px (+20px für Labels mit Stagger)
```

### 2. Mehr Abstand zwischen Label und Icon

```text
Aktuell:
- labelPosition === 'above' → "bottom-full mb-0.5"
- Connection line: h-1 (4px)

Neu:
- labelPosition === 'above' → "bottom-full mb-2" (8px)
- Connection line: h-2 (8px) - längere Verbindung
```

### 3. Today-Line hinter Labels rendern (z-index)

```text
Aktuell:
- TodayLine: z-10
- Labels: z-20

Die Labels haben bereits höheren z-index, aber die Today-Line sollte 
visuell hinter den Labels sein. Wir reduzieren auf z-5.
```

### 4. Label-Text etwas größer für bessere Lesbarkeit

```text
Aktuell:
- Datum: text-[9px]
- Titel: text-[8px]

Neu:
- Datum: text-[10px]
- Titel: text-[9px]
```

## Dateien & Änderungen

| Datei | Änderung |
|-------|----------|
| `src/components/planning/ClientPeriodBar.tsx` | Größerer Label-Abstand (`mb-2`), längere Verbindungslinie (`h-2`), größere Schrift |
| `src/components/planning/HalfYearCalendar.tsx` | `ROW_HEIGHT_EXPANDED = 120`, TodayLine `z-5` |
| `src/components/planning/QuarterCalendar.tsx` | Gleiche Änderungen |

## Technische Details

### ClientPeriodBar.tsx - Label-Rendering

```tsx
{/* Compact Label - mehr Abstand, größere Schrift */}
{showLabels && mpShowLabel && (
  <div 
    className={cn(
      "absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20",
      labelPosition === 'above' ? "bottom-full mb-2" : "top-full mt-2",  // mb-0.5 → mb-2
      labelPosition === 'below' && "flex-col-reverse"
    )}
  >
    <div className="w-px h-2 bg-muted-foreground/30" />  {/* h-1 → h-2, opacity 20→30 */}
    <div className="text-center" style={{ maxWidth: '100px' }}>
      <div className="text-[10px] font-medium text-foreground leading-tight">  {/* 9px → 10px */}
        {formatDateCompact(new Date(milestone.date))}
      </div>
      <div className="text-[9px] text-muted-foreground leading-tight line-clamp-2">  {/* 8px → 9px */}
        {milestone.title}
      </div>
    </div>
  </div>
)}
```

### HalfYearCalendar.tsx - Row Height & Z-Index

```tsx
const ROW_HEIGHT_EXPANDED = 120; // vorher 100

// TodayLine z-index reduzieren
<div 
  className="absolute top-0 bottom-0 w-0.5 bg-primary z-5 pointer-events-none"  // z-10 → z-5
  ...
>
```

### QuarterCalendar.tsx - Gleiche Änderungen

```tsx
const ROW_HEIGHT_EXPANDED = 120;
// TodayLine z-5
```

## Erwartetes Ergebnis

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Label-Icon Abstand | 2px (mb-0.5) | 8px (mb-2) |
| Verbindungslinie | 4px, kaum sichtbar | 8px, leicht sichtbar |
| Schriftgröße | 8-9px | 9-10px |
| Zeilenhöhe (Labels an) | 100px | 120px |
| Today-Line Layer | z-10 (über Icons) | z-5 (hinter Labels) |

Das Ergebnis: Klare visuelle Trennung, keine Überlappungen, bessere Lesbarkeit - ohne das Layout fundamental zu ändern.

