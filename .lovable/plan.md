

# Timeline Labels Redesign: Investor-Ready Information Architecture

## Kritische Analyse des aktuellen Zustands

### Problem 1: Label-Chaos bei dichten Meilensteinen
Die Labels (`whitespace-nowrap`) kollidieren visuell bei nahen Meilensteinen:
- "Datenanforderung CIO Wagon Wagon PoV - Delivery" überlappen sich
- Keine Truncation, keine Collision-Detection
- 120px Höhe reicht nicht für überlappende Labels

### Problem 2: Visueller Noise
- **Jeder** Meilenstein bekommt ein Label → Information Overload
- Keine visuelle Hierarchie zwischen wichtigen und unwichtigen Meilensteinen
- Datum unter jedem Label → Redundanz

### Problem 3: Inkonsistente Positionierung
- Labels immer mittig über Icon → kollisionsträchtig
- Keine intelligente Ausweich-Strategie

---

## World-Class Solution: "Smart Labels" Pattern

Inspiriert von Linear, Notion Timeline, Apple Keynote - mit einem entscheidenden Twist: **Selektive Label-Anzeige** + **Hover-Reveal**.

### Design-Philosophie

```text
Standard-Ansicht (Labels AN):
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│              │             Vertrag              Deadline                    │
│ Wolman       │████████████●══════════════════════════════════════⚠═════████│
│              │            5. Feb               30. Apr                      │
│              │                    ●       ●                                 │
│              │                    ↑       ↑                                 │
│              │              (nur Icon, kein Label - bei Hover: Tooltip)     │
└─────────────────────────────────────────────────────────────────────────────┘

Legende:
● = Standard-Meilensteine (nur Icon, Tooltip bei Hover)
●+Label = Wichtige Meilensteine (contract, kickoff, deadline, delivery)
```

### Regel: Selektive Label-Anzeige

| Milestone Type | Label sichtbar? | Begründung |
|----------------|-----------------|-------------|
| `contract` | Ja | Vertragsbeginn = kritisch |
| `kickoff` | Ja | Projektstart = kritisch |
| `deadline` | Ja | Immer wichtig |
| `delivery` | Ja | Key Deliverable |
| `meeting` | Nein (nur Icon) | Wiederkehrend, zu viele |
| `payment` | Nein (nur Icon) | Intern, weniger wichtig |
| `general` | Nein (nur Icon) | Catch-all |

### Collision-Avoidance-Strategie

Bei Labels, die zu nah beieinander sind (< 80px Abstand):

1. **Stagger**: Erstes Label oben, zweites unten
2. **Truncate**: Labels auf max 18 Zeichen + "..."
3. **Group**: Bei > 2 Labels auf < 100px: "3 Meilensteine" als Batch-Label

---

## Technische Implementierung

### 1. Label-Visibility-Logik

```typescript
const LABEL_VISIBLE_TYPES: MilestoneType[] = ['contract', 'kickoff', 'deadline', 'delivery'];

function shouldShowLabel(type: MilestoneType): boolean {
  return LABEL_VISIBLE_TYPES.includes(type);
}
```

### 2. Smart Truncation

```typescript
function truncateLabel(title: string, maxLength = 20): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 1).trim() + '…';
}
```

### 3. Stagger-Positionierung bei Kollision

Wenn zwei Labels < 60px voneinander entfernt sind:
- Erstes Label: `bottom-full mb-1` (oben)
- Zweites Label: `top-full mt-1` (unten)

```typescript
// Pseudo-Code für Position-Berechnung
const positions = milestonePositions.map((mp, idx, arr) => {
  const prevMp = arr[idx - 1];
  const distance = prevMp ? mp.left - prevMp.left : Infinity;
  
  // Stagger wenn zu nah
  if (distance < MIN_LABEL_DISTANCE) {
    return { ...mp, labelPosition: idx % 2 === 0 ? 'above' : 'below' };
  }
  return { ...mp, labelPosition: 'above' };
});
```

### 4. Verbesserte Zeilen-Höhe

Statt statischer `120px` bei Labels:
- Basis: 80px
- Mit Labels (normal): 100px
- Mit gestaggerten Labels: 140px (auto-detect wenn nötig)

---

## Visual Design Specs

### Label-Styling (world-class)

```css
/* Label Container */
.milestone-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

/* Title */
.milestone-label-title {
  font-size: 11px;        /* Etwas kleiner für bessere Proportion */
  font-weight: 500;
  color: var(--foreground);
  line-height: 1.2;
  max-width: 100px;       /* Constraint */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Date */
.milestone-label-date {
  font-size: 10px;
  color: var(--muted-foreground);
  opacity: 0.8;
}

/* Connection Line */
.milestone-connection-line {
  width: 1px;
  height: 6px;
  background: var(--muted-foreground);
  opacity: 0.25;
}
```

### Icon-Refinements

- Icons von `h-3 w-3` auf `h-4 w-4` für bessere Lesbarkeit
- Border-Radius: `rounded-full` beibehalten
- Hover: `scale-110` → `scale-105` (subtiler)
- Shadow: `shadow-sm` → `shadow-xs` (dezenter)

---

## Dateien & Änderungen

| Datei | Änderungen |
|-------|------------|
| `src/lib/planning/types.ts` | `LABEL_VISIBLE_TYPES` Array hinzufügen |
| `src/components/planning/ClientPeriodBar.tsx` | Smart Label Logic, Stagger, Truncation |
| `src/components/planning/HalfYearCalendar.tsx` | Dynamische Row-Height basierend auf Label-Density |
| `src/components/planning/QuarterCalendar.tsx` | Gleiche Änderungen |

---

## Implementierungs-Details

### ClientPeriodBar.tsx - Kernänderungen

```typescript
// Neue Konstanten
const LABEL_VISIBLE_TYPES: MilestoneType[] = ['contract', 'kickoff', 'deadline', 'delivery'];
const MAX_LABEL_LENGTH = 20;
const MIN_LABEL_DISTANCE_PERCENT = 8; // 8% der Gesamtbreite

// Utility Functions
function truncateLabel(title: string): string {
  return title.length > MAX_LABEL_LENGTH 
    ? title.slice(0, MAX_LABEL_LENGTH - 1).trim() + '…' 
    : title;
}

// In milestonePositions useMemo:
// 1. Berechne Positionen wie bisher
// 2. Bestimme welche Labels sichtbar sind
// 3. Berechne Stagger für nahe Labels
const enrichedPositions = useMemo(() => {
  return milestonePositions.map((mp, idx, arr) => {
    const showLabel = LABEL_VISIBLE_TYPES.includes(mp.milestone.milestone_type);
    
    if (!showLabel) return { ...mp, showLabel: false, labelPosition: 'above' as const };
    
    // Prüfe Abstand zum vorherigen Label (nur wenn auch sichtbar)
    const prevVisible = arr.slice(0, idx).reverse().find(p => 
      LABEL_VISIBLE_TYPES.includes(p.milestone.milestone_type)
    );
    
    const distance = prevVisible ? mp.left - prevVisible.left : Infinity;
    const needsStagger = distance < MIN_LABEL_DISTANCE_PERCENT;
    
    // Alternierende Position bei Stagger
    let labelPosition: 'above' | 'below' = 'above';
    if (needsStagger) {
      const visibleIndex = arr.filter((p, i) => 
        i < idx && LABEL_VISIBLE_TYPES.includes(p.milestone.milestone_type)
      ).length;
      labelPosition = visibleIndex % 2 === 0 ? 'above' : 'below';
    }
    
    return { ...mp, showLabel: true, labelPosition };
  });
}, [milestonePositions]);
```

### Label-Rendering

```tsx
{showLabels && mp.showLabel && (
  <div 
    className={cn(
      "absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20",
      mp.labelPosition === 'above' ? "bottom-full mb-1" : "top-full mt-1",
      mp.labelPosition === 'below' && "flex-col-reverse"
    )}
  >
    {mp.labelPosition === 'above' && (
      <>
        <div className="text-center">
          <div className="text-[11px] font-medium text-foreground leading-tight max-w-[100px] truncate">
            {truncateLabel(milestone.title)}
          </div>
          <div className="text-[10px] text-muted-foreground/80">
            {format(new Date(milestone.date), 'd. MMM', { locale: de })}
          </div>
        </div>
        <div className="w-px h-1.5 bg-muted-foreground/25" />
      </>
    )}
    {mp.labelPosition === 'below' && (
      <>
        <div className="w-px h-1.5 bg-muted-foreground/25" />
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground/80">
            {format(new Date(milestone.date), 'd. MMM', { locale: de })}
          </div>
          <div className="text-[11px] font-medium text-foreground leading-tight max-w-[100px] truncate">
            {truncateLabel(milestone.title)}
          </div>
        </div>
      </>
    )}
  </div>
)}
```

---

## Erwartetes Ergebnis

| Aspekt | Aktuell | Nachher |
|--------|---------|---------|
| Label-Kollisionen | Ständig | Eliminiert durch Stagger |
| Visual Noise | Hoch (alle Labels) | Niedrig (nur wichtige) |
| Truncation | Keine | Max 20 Zeichen |
| Lesbarkeit | Schlecht | Exzellent |
| Investor-Präsentation | Problematisch | Polished |

Das Ergebnis wird clean, hierarchisch und sofort verständlich sein - wie eine Linear oder Notion Timeline.

