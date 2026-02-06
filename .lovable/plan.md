

# Fix: Label-Positionierung & Export-Qualität für Planungsansicht

## Problem-Analyse (aus dem Screenshot)

### 1. Label-Positionierung fehlerhaft

**Wafon (27. Feb):**
- Das Label "27. Feb. Pol." sitzt direkt NEBEN dem Meilenstein-Icon statt DARÜBER/DARUNTER
- Die Verbindungslinie geht nicht zum Icon, sondern schwebt irgendwo

**Sensoplast (5. März):**
- Gleiches Problem - "5. März Kick-Off" ist horizontal versetzt
- Zeilen-/Spalten-Layout ist falsch - der Text bricht merkwürdig um

**Root Cause:**
Der aktuelle Code positioniert Labels mit `left-1/2 -translate-x-1/2`, was bei Meilensteinen am RECHTEN Rand der Periode-Bar problematisch wird. Wenn `relativeLeft` nahe 100% ist, wird das Label außerhalb des sichtbaren Bereichs gerendert oder clippt am Container.

### 2. Verbindungslinien-Ausrichtung

Die vertikale Verbindungslinie (`w-px h-2`) wird INNERHALB des Label-Containers gerendert, aber die Positionierung mit `flex-col` und `flex-col-reverse` führt zu inkonsistenten Ergebnissen:

```
AKTUELL (Zeile 185-192):
<div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
  <div className="w-px h-2" />   ← Linie VOR Text
  <div className="text-center">  ← Text
</div>
```

Das Problem: Bei `flex-col-reverse` (für "below") wird die Linie UNTER dem Text gerendert - aber die Linie soll IMMER zum Icon zeigen.

### 3. Export-Qualität

Der Screenshot zeigt, dass `html2canvas` grundsätzlich funktioniert, aber:
- Die Sub-Pixel-Positionierung von Tailwind-Klassen (`translate-x-1/2`) wird nicht korrekt erfasst
- Overflow von Labels am Rand wird abgeschnitten
- Keine Polsterung am Chart-Rand für Labels die "überstehen"

## Lösungs-Architektur

### A. Label-Positionierung korrigieren

```text
STRUKTUR AKTUELL:
┌─────────────────────────────────────────┐
│  [Icon]                                 │
│    └─ Label (absolute, center via 50%)  │ ← PROBLEM: clippt am Rand
└─────────────────────────────────────────┘

STRUKTUR NEU:
┌──────────────────────────────────────────────┐
│  [Icon]                                      │
│    └─ Label (transform-aware, edge-safe)     │ ← Intelligente Positionierung
└──────────────────────────────────────────────┘
```

**Lösung: Edge-Safe Label Positioning**
- Bei `relativeLeft > 85%`: Label nach LINKS ausrichten
- Bei `relativeLeft < 15%`: Label nach RECHTS ausrichten
- Sonst: Zentriert

### B. Verbindungslinie zum Icon korrigieren

```text
AKTUELL (mit flex-col-reverse Problem):
Label Position = 'below'
→ flex-col-reverse
→ [Text] [Line]  ← Linie zeigt NACH UNTEN (weg vom Icon)

LÖSUNG:
Separate Rendering-Logik für Linie:
- Above: Linie am UNTEREN Rand des Labels (zeigt nach unten zum Icon)
- Below: Linie am OBEREN Rand des Labels (zeigt nach oben zum Icon)
```

### C. Export-Container mit Padding

```text
AKTUELL:
┌───────────────────────────┐
│ Chart (overflow: hidden)  │ ← Labels werden abgeschnitten
└───────────────────────────┘

NEU:
┌─────────────────────────────────┐
│ ┌───────────────────────────┐   │
│ │ Chart                     │   │ ← Padding für Label-Overflow
│ └───────────────────────────┘   │
└─────────────────────────────────┘
```

## Implementierung

### Datei 1: `ClientPeriodBar.tsx`

**Änderung A: Edge-Safe Label Alignment**

```tsx
// Neue Funktion zur Berechnung der Text-Ausrichtung
function getLabelAlignment(leftPercent: number): 'left' | 'center' | 'right' {
  if (leftPercent > 85) return 'right';
  if (leftPercent < 15) return 'left';
  return 'center';
}

// In renderMilestoneMarker:
const alignment = getLabelAlignment(leftPos);

<div 
  className={cn(
    "absolute flex flex-col items-center pointer-events-none z-20",
    labelPosition === 'above' ? "bottom-full mb-1" : "top-full mt-1",
    // Edge-safe alignment
    alignment === 'center' && "left-1/2 -translate-x-1/2",
    alignment === 'left' && "left-0",
    alignment === 'right' && "right-0 translate-x-1/2"
  )}
>
```

**Änderung B: Verbindungslinie immer zum Icon zeigend**

```tsx
{/* Label mit korrekter Linien-Richtung */}
{showLabels && mpShowLabel && (
  <div 
    className={cn(
      "absolute pointer-events-none z-20 flex flex-col items-center",
      labelPosition === 'above' ? "bottom-full mb-1" : "top-full mt-1",
      alignment === 'center' && "left-1/2 -translate-x-1/2",
      alignment === 'left' && "left-0",
      alignment === 'right' && "right-0"
    )}
  >
    {/* Linie zum Icon - IMMER in Richtung Icon */}
    {labelPosition === 'above' && (
      <div className="order-last w-px h-3 bg-muted-foreground/40" />
    )}
    {labelPosition === 'below' && (
      <div className="order-first w-px h-3 bg-muted-foreground/40" />
    )}
    
    {/* Text */}
    <div 
      className={cn(
        "whitespace-nowrap",
        alignment === 'center' && "text-center",
        alignment === 'left' && "text-left",
        alignment === 'right' && "text-right"
      )} 
      style={{ maxWidth: '120px' }}
    >
      <div className="text-[10px] font-medium text-foreground leading-tight">
        {formatDateCompact(new Date(milestone.date))}
      </div>
      <div className="text-[9px] text-muted-foreground leading-tight line-clamp-2">
        {milestone.title}
      </div>
    </div>
  </div>
)}
```

### Datei 2: `QuarterCalendar.tsx` & `HalfYearCalendar.tsx`

**Änderung: Overflow erlauben für Labels**

```tsx
// Client period bar container - overflow visible für Labels
<div className="relative h-full flex items-center px-2 overflow-visible">
  <ClientPeriodBar ... />
</div>

// Und am Chart-Container:
<div id="planning-chart" className="border rounded-xl bg-card relative overflow-visible">
```

Aber für Export brauchen wir einen Wrapper:

```tsx
// Wrapper für Export mit Padding
<div id="planning-chart-export-wrapper" className="p-4">
  <div id="planning-chart" className="border rounded-xl overflow-visible bg-card relative">
    ...
  </div>
</div>
```

### Datei 3: `exportCanvas.ts`

**Änderung: Export-Wrapper statt Chart-Element**

```tsx
export async function exportPlanningCanvas({
  elementId,
  format,
  filename,
  periodLabel,
}: ExportOptions): Promise<void> {
  // Versuche erst den Wrapper, dann das Chart selbst
  const wrapperElement = document.getElementById(`${elementId}-export-wrapper`);
  const element = wrapperElement || document.getElementById(elementId);
  
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Temporär overflow visible setzen für korrektes Capturing
  const originalOverflow = element.style.overflow;
  element.style.overflow = 'visible';

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff', // Explizit weiß für sauberen Export
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth + 40, // Extra padding für Labels
    windowHeight: element.scrollHeight + 40,
  });

  element.style.overflow = originalOverflow;
  
  // ... rest
}
```

## Visuelle Verbesserungen

### Label-Design Refinement

```text
AKTUELL:
┌─────────┐
│ 5. Mär  │  ← Text zu dicht, schwer lesbar
│ Kick-   │
│ Off     │
└─────────┘

NEU:
┌───────────┐
│ 5. März   │  ← Bessere Lesbarkeit
│ Kick-Off  │  ← Voller Text wenn möglich
└───────────┘
  │  ← Klare Verbindungslinie
  ●  ← Icon
```

**Konkrete Werte:**
- Datum: `text-[11px] font-semibold` (war 10px/medium)
- Titel: `text-[10px] text-muted-foreground` (war 9px)
- Linie: `h-3` (12px) statt `h-2` (8px)
- Max-Width: `120px` statt `100px`

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `ClientPeriodBar.tsx` | Edge-safe Label-Alignment, Verbindungslinie-Fix, größere Schrift |
| `QuarterCalendar.tsx` | Wrapper für Export, overflow-visible |
| `HalfYearCalendar.tsx` | Wrapper für Export, overflow-visible |
| `exportCanvas.ts` | Wrapper-Support, expliziter weißer Background, extra Padding |

## Erwartetes Ergebnis

Nach diesen Änderungen:

1. **Labels am Rand** (wie Wafon 27. Feb) werden nach innen ausgerichtet statt abgeschnitten
2. **Verbindungslinien** zeigen immer korrekt zum Icon (egal ob above/below)
3. **Export** erfasst alle Labels vollständig mit sauberem weißem Hintergrund
4. **Lesbarkeit** verbessert durch größere Schrift und mehr Platz

