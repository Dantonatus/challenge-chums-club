
# Projektplanung Pro: Halbjahres-Ansicht + Kundenperioden + HQ-Export

## Executive Summary

Du brauchst drei signifikante Erweiterungen, die das Planning-Tool von einem Meilenstein-Tracker zu einem vollwertigen **Project Timeline Tool** upgraden:

1. **Halbjahres-Ansicht (6 Monate)** - Toggle zwischen 3-Monat und 6-Monat View
2. **Kunden-Betreuungsperioden** - Visuelle Darstellung der Projektlaufzeit als durchgehender Balken
3. **HQ PDF-Export** - Screenshot-artige Qualität der aktuellen Ansicht

Diese Änderungen transformieren das Tool von "Termine verwalten" zu "Projektpipeline visualisieren".

---

## 1. Datenmodell-Erweiterung

### Migration: Clients-Tabelle erweitern

```sql
ALTER TABLE public.clients
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE;
```

**Warum start_date/end_date auf Client-Ebene?**
- Kunden haben eine Betreuungsperiode (z.B. Sensoplast: 13.01 - 17.04)
- Meilensteine sind Ereignisse INNERHALB dieser Periode
- Visualisierung: Der "Projektbalken" zeigt die gesamte Laufzeit, Meilensteine sind Marker auf diesem Balken

### TypeScript-Erweiterung

```typescript
// src/lib/planning/types.ts
export interface Client {
  // ... existing fields
  start_date: string | null;  // NEW
  end_date: string | null;    // NEW
}

export interface ClientFormData {
  // ... existing fields
  start_date?: string;  // NEW
  end_date?: string;    // NEW
}
```

---

## 2. View-Mode: Quartal vs. Halbjahr

### Neue Types

```typescript
export type ViewMode = 'quarter' | 'halfyear';

export interface HalfYear {
  year: number;
  half: 1 | 2; // H1: Jan-Jun, H2: Jul-Dec
}

// Helper functions
export function getHalfYearMonths(h: HalfYear): number[] {
  return h.half === 1 
    ? [0, 1, 2, 3, 4, 5] 
    : [6, 7, 8, 9, 10, 11];
}

export function getHalfYearDateRange(h: HalfYear): { start: Date; end: Date } {
  const startMonth = h.half === 1 ? 0 : 6;
  return {
    start: new Date(h.year, startMonth, 1),
    end: new Date(h.year, startMonth + 6, 0)
  };
}

export function getCurrentHalfYear(): HalfYear {
  const now = new Date();
  return { 
    year: now.getFullYear(), 
    half: now.getMonth() < 6 ? 1 : 2 
  };
}
```

### Header-Component Update

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [←] H1 2026 [→]         [Quartal ▾ | Halbjahr]        [PDF ↓] [Heute] [+ Meilenstein] │
│       Jan – Jun                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Verhalten:**
- Toggle zwischen Quartal (3 Monate) und Halbjahr (6 Monate)
- Navigation passt sich automatisch an (Q1→Q2 vs H1→H2)
- State im URL-Parameter für Bookmarkability: `/app/planning?view=halfyear&h=1&year=2026`

---

## 3. Kunden-Betreuungsperioden: Visual Design

### Gantt-artige Darstellung

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Kunden      │ JANUAR      │ FEBRUAR     │ MÄRZ        │ APRIL       │ MAI │ JUNI        │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────┼─────────────┤
│             │             │             │             │             │     │             │
│ Sensoplast  │ ┌───────────┴─────────────┴─────────────┐             │     │             │
│ ━━━━━━━━━   │ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│             │     │             │
│             │ │ ● 13.01    ● 24.02           ⚠ 17.04 │             │     │             │
│             │ │ Vertrag    Kick-Off          Deadline│             │     │             │
│             │ └───────────────────────────────────────┘             │     │             │
│             │             │             │             │             │     │             │
│ Acme Corp   │             │ ┌───────────┴─────────────┴─────────────┴─────┐             │
│ ━━━━━━━━━   │             │ │░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│             │
│             │             │ │ ● 15.02                              ● 30.05│             │
│             │             │ │ Start                                Finish │             │
│             │             │ └────────────────────────────────────────────┘             │
└─────────────┴─────────────┴─────────────────────────────────────────────────────────────┘
```

### Design-Spezifikation

**Projektbalken (Client Period Bar):**
- **Höhe:** 48px (genug Platz für Meilenstein-Marker + Labels)
- **Farbe:** Client-Farbe mit 20% Opacity als Background, 100% für den Border-Top
- **Border-Radius:** 8px
- **Position:** Exakt von start_date bis end_date auf der Timeline

**Meilenstein-Marker auf dem Balken:**
- **Icons:** Kleine (16px) Type-Icons positioniert auf dem Balken
- **Tooltip on Hover:** Zeigt Titel + Datum
- **Click:** Öffnet Detail-Sheet (wie bisher)

**Edge Cases:**
- Client ohne start_date/end_date: Zeige nur die Meilensteine als einzelne Karten (wie aktuell)
- start_date/end_date außerhalb des View-Range: Balken "überläuft" am Rand mit Fade

### Implementation: ClientPeriodBar Component

```typescript
interface ClientPeriodBarProps {
  client: ClientWithPeriod;
  milestones: MilestoneWithClient[];
  viewRange: { start: Date; end: Date };
  monthColumns: Date[];
  onMilestoneClick: (m: MilestoneWithClient) => void;
}
```

**Berechnungslogik:**
- `leftPercent`: Position des Start-Datums relativ zur View
- `widthPercent`: Breite basierend auf Dauer relativ zur View
- Milestones werden als absolute Positionen innerhalb des Balkens platziert

---

## 4. 7-Kunden-Limit + Scrolling

### Layout-Logik

```typescript
const MAX_VISIBLE_CLIENTS = 7;
const ROW_HEIGHT = 100; // px pro Kundenzeile (inkl. Padding)
const VISIBLE_HEIGHT = MAX_VISIBLE_CLIENTS * ROW_HEIGHT; // 700px
```

**Behavior:**
- Erste 7 Kunden sofort sichtbar
- ScrollArea mit smooth scrolling für weitere Kunden
- Sticky Header (Monate bleiben oben fixiert beim Scrollen)
- Optional: Alphabetische Sortierung oder nach "nächster Deadline"

### ScrollArea Integration

```tsx
<ScrollArea className="h-[700px]">
  <div className="divide-y">
    {clientData.map(client => (
      <ClientPeriodRow key={client.id} ... />
    ))}
  </div>
</ScrollArea>
```

---

## 5. HQ PDF Export

### Technologie-Entscheidung

**Option A: html2canvas + jsPDF** 
- Screenshot des DOM → Canvas → PDF
- Pro: Exakt wie auf Screen
- Con: Schlechte Text-Qualität, keine Vektoren

**Option B: Custom jsPDF Rendering** (EMPFOHLEN)
- Programmatische PDF-Erstellung mit jsPDF + jspdf-autotable
- Pro: Vektorgrafiken, scharfe Texte, kleinere Dateigröße
- Con: Mehr Aufwand, muss manuell gerendert werden

**Recommendation: Option B mit Custom Rendering**

### PDF Layout Design

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  [Logo]    PROJEKTPLANUNG                            Q1 2026 (Jan-Mär) │
│            Generiert: 06.02.2026                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Sensoplast  ████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░││
│  │             13.01           24.02                    17.04         ││
│  │             Vertrag         Kick-Off                 Deadline      ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌────────────────────────────────────────────────────────────────────┐│
│  │ Acme Corp   ░░░░░░░░░████████████████████████████████████████████░░││
│  │                      15.02                                  30.05  ││
│  │                      Start                                  Finish ││
│  └────────────────────────────────────────────────────────────────────┘│
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Seite 1/1                        habitbattle.lovable.app               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Export-Button Integration

```tsx
// In QuarterHeader.tsx
<Button variant="outline" size="sm" onClick={handleExport}>
  <Download className="h-4 w-4 mr-1" />
  PDF
</Button>
```

**Export-Funktion:**
1. Sammle alle sichtbaren Clients + Milestones
2. Berechne Positionen für jeden Projektbalken
3. Rendere mit jsPDF:
   - Header mit Titel + Zeitraum
   - Pro Client: Farbiger Balken + Meilenstein-Marker
   - Footer mit Timestamp

---

## 6. Dateien & Änderungen

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/components/planning/ClientPeriodBar.tsx` | Gantt-artiger Projektbalken |
| `src/components/planning/HalfYearCalendar.tsx` | 6-Monats-Grid-Ansicht |
| `src/components/planning/ViewModeToggle.tsx` | Quartal/Halbjahr Toggle |
| `src/lib/planning/exportPDF.ts` | HQ PDF Export Logik |

### Geänderte Dateien

| Datei | Änderungen |
|-------|------------|
| `src/lib/planning/types.ts` | + HalfYear type, + ViewMode, + Client start/end_date |
| `src/hooks/useClients.ts` | + start_date/end_date CRUD |
| `src/hooks/useMilestones.ts` | + HalfYear Support für Queries |
| `src/components/planning/QuarterHeader.tsx` | + ViewMode Toggle, + Export Button |
| `src/components/planning/QuarterCalendar.tsx` | + ClientPeriodBar, + ScrollArea mit 7-Client-Limit |
| `src/components/planning/MilestoneQuickAdd.tsx` | + Client start/end_date Felder |
| `src/pages/app/planning/PlanningPage.tsx` | + ViewMode State, + HalfYear Support |

### Migration

```sql
-- 20260206_add_client_period.sql
ALTER TABLE public.clients
  ADD COLUMN start_date DATE,
  ADD COLUMN end_date DATE;

-- Optionaler Check-Constraint
ALTER TABLE public.clients
  ADD CONSTRAINT chk_client_period CHECK (start_date IS NULL OR end_date IS NULL OR start_date <= end_date);
```

---

## 7. Implementierungs-Reihenfolge

| Phase | Scope | Aufwand |
|-------|-------|---------|
| 1 | DB Migration + Types | 10min |
| 2 | ViewMode Toggle (Quartal/Halbjahr) | 30min |
| 3 | HalfYearCalendar Grid | 45min |
| 4 | useMilestones HalfYear Support | 15min |
| 5 | ClientPeriodBar mit Gantt-Visualization | 60min |
| 6 | ScrollArea + 7-Client-Limit | 15min |
| 7 | MilestoneQuickAdd + Client Period Fields | 20min |
| 8 | PDF Export (jsPDF custom rendering) | 45min |
| 9 | Polish: Animations, Edge Cases | 30min |

**Gesamt: ~4.5 Stunden**

---

## 8. Edge Cases & Polish

### Bedacht:
- **Client ohne Period:** Zeige nur Meilensteine (kein Balken)
- **Period überlappt View-Grenzen:** Balken mit gradient fade am Rand
- **Mobile:** Halbjahres-View nicht sinnvoll → Force Quartal/Monat auf Mobile
- **Empty State:** "Füge einen Kunden mit Betreuungszeitraum hinzu"
- **PDF auf Halbjahr:** Querformat für bessere Lesbarkeit

### Animations:
- View-Mode Switch: Smooth transition mit `framer-motion`
- Projektbalken: Fade-in beim ersten Render
- Today-Line: Subtle pulse animation

---

## 9. Erwartetes Ergebnis

Nach Implementierung hast du:

| Feature | Vorher | Nachher |
|---------|--------|---------|
| Zeitraum-View | 3 Monate | 3 oder 6 Monate wählbar |
| Kunden-Darstellung | Zeile mit Meilensteine | Projektbalken + Meilensteine |
| Sichtbare Kunden | Alle (ggf. unübersichtlich) | 7 sofort, Rest scrollbar |
| Export | Keiner | HQ PDF mit Gantt-ähnlicher Ansicht |
| Planungsverständnis | "Was passiert wann?" | "Wie lang dauern Projekte + was sind die Key-Events?" |

Das Tool wird von einem **Kalender** zu einer **Projektpipeline-Visualization** - ähnlich wie Linear Roadmap oder Notion Timeline, aber fokussiert auf Client-Betreuung.
