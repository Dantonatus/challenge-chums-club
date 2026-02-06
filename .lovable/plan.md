
# World-Class Timeline Labels: Investor-Ready Design

## Analyse der Probleme

### Problem 1: Scroll bei weniger als 7 Kunden
Das `ScrollArea`-Component wird immer gerendert. Bei `needsScroll = false` wird `className="h-[560px]"` nicht angewendet, aber `style={{ height: 'auto' }}` erzeugt dennoch ungewolltes Scroll-Verhalten wegen der ScrollArea-Wrapper.

**Fix:** ScrollArea nur rendern wenn `needsScroll` true ist, sonst ein einfaches `<div>`.

### Problem 2: Labels sehen unprofessionell aus
Aktuelle Implementation:
- 10px Font - viel zu klein
- Truncated auf 80px - Text wird abgeschnitten  
- Positioniert unter dem Icon - kollidiert visuell mit Zeilen darunter
- Separates Popup für jedes Label - wirkt "zusammengestückelt"

### Problem 3: Zeilen brauchen mehr Platz
80px Row-Height ist zu komprimiert für:
- Investor-Präsentationen
- Print/PDF Export
- Lesbarkeit bei vielen Meilensteinen

---

## Design-Lösung: "Connected Label" Pattern

Inspiriert von Linear Roadmap, Notion Timeline, und Apple Keynote Timeline-Views.

### Visuelles Konzept

```text
Wenn Labels AUS:
┌──────────────────────────────────────────────────────────────────────────┐
│ Sensoplast   │████████████●════════════════●═══════════════⚠════════████│
└──────────────────────────────────────────────────────────────────────────┘
                             ↑ nur Icons auf dem Balken

Wenn Labels AN:
┌──────────────────────────────────────────────────────────────────────────┐
│              │                                                           │
│              │                                                           │
│              │             Vertrag           Kick-Off          Deadline  │
│ Sensoplast   │████████████●═════════════════●══════════════════⚠════████│
│              │             13. Jan           24. Feb           17. Apr   │
│              │                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Design-Spezifikationen

**Row Height Anpassung:**
- `ROW_HEIGHT` von 80px → **120px** (Labels AN)
- Dynamic: 80px wenn Labels aus, 120px wenn Labels an

**Label-Styling (world-class):**
- **Title:** 12px, font-medium, volle Breite (kein truncate)
- **Date:** 11px, text-muted-foreground
- **Position:** Labels ÜBER dem Icon (nicht darunter)
- **Alignment:** Zentriert zum Milestone-Icon
- **No box/border:** Clean floating text, kein "Popup"-Look
- **Spacing:** 4px gap zwischen Title und Icon

**Verbindungslinie (optional, ultra-polish):**
- Dünne vertikale Linie vom Label zum Icon
- 1px, color: `text-muted-foreground/30`
- Gibt visuellen Anchor ohne zu dominieren

---

## Technische Implementation

### 1. Dynamic Row Height

```typescript
// In QuarterCalendar.tsx und HalfYearCalendar.tsx
const ROW_HEIGHT_COMPACT = 80;
const ROW_HEIGHT_EXPANDED = 120;

const rowHeight = showLabels ? ROW_HEIGHT_EXPANDED : ROW_HEIGHT_COMPACT;
```

### 2. Conditional ScrollArea Rendering

```tsx
// Anstatt:
<ScrollArea className={cn(needsScroll && "h-[560px]")} style={{...}}>

// Besser:
{needsScroll ? (
  <ScrollArea style={{ height: `${MAX_VISIBLE_CLIENTS * rowHeight}px` }}>
    {renderClientRows()}
  </ScrollArea>
) : (
  <div>{renderClientRows()}</div>
)}
```

### 3. Elegantes Label-Design in ClientPeriodBar

```tsx
{showLabels && (
  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 flex flex-col items-center pointer-events-none">
    {/* Connection line */}
    <div className="w-px h-3 bg-muted-foreground/20" />
    {/* Label */}
    <div className="text-center whitespace-nowrap px-1">
      <div className="text-xs font-medium text-foreground leading-tight">
        {milestone.title}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {format(new Date(milestone.date), 'd. MMM', { locale: de })}
      </div>
    </div>
  </div>
)}
```

### 4. Anti-Overlap für nahe Meilensteine

Wenn Labels sich überlappen würden, alternative Strategien:
- **Stagger:** Jedes zweite Label nach oben/unten versetzt
- **Smart grouping:** Nahe Labels in einer Zeile zusammenfassen
- **Priority:** Nur wichtigste Labels zeigen (Deadlines > andere)

Für Phase 1: Labels immer oben, bei Overlap tolerieren (User kann zoomen/Halbjahr wechseln)

---

## Dateien & Änderungen

| Datei | Änderungen |
|-------|------------|
| `src/components/planning/QuarterCalendar.tsx` | Dynamic row height, conditional ScrollArea |
| `src/components/planning/HalfYearCalendar.tsx` | Dynamic row height, conditional ScrollArea |
| `src/components/planning/ClientPeriodBar.tsx` | Elegantes Label-Design über Icons |

---

## Visual Polish Details

### Header-Toggle Upgrade
Der aktuelle Tag-Icon + Switch sieht okay aus, könnte aber cleaner sein:

```text
Aktuell:   [🏷] [o]  ← Etwas unklar was es macht
           
Besser:    [🏷 Labels] [toggle]  ← Text-Label für Klarheit
```

Oder als Button mit Icon-State:
```text
[ Labels ]  ← Outline wenn aus
[■ Labels]  ← Filled wenn an
```

### Zeilen-Hover Effekt
Bei mehr Höhe wirkt der Hover-Effekt stärker:
- `hover:bg-muted/5` statt `hover:bg-muted/10`
- Subtiler für professionellen Look

---

## Erwartetes Ergebnis

| Aspekt | Vorher | Nachher |
|--------|--------|---------|
| Row Height | 80px (starr) | 80px/120px (dynamisch) |
| Label-Position | Unter Icon, Box | Über Icon, floating |
| Label-Größe | 10px, truncated | 12px, vollständig |
| Scroll | Immer vorhanden | Nur ab 7+ Clients |
| Investor-Ready | ❌ | ✅ |

Das Ergebnis wird wie eine Linear/Notion Timeline aussehen - clean, professionell, sofort verständlich auf den ersten Blick.
