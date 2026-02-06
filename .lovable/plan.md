
# Projektplanung: Quartalskalender mit AI-Copilot

## Executive Summary

Ein neuer Tab "Projektplanung" nach Tasks, der einen immersiven Quartalskalender für Kunden-Meilensteine bietet. Focus auf **Klarheit, Scanbarkeit und schnelle Erfassung** - keine Feature-Bloat, sondern ein Tool das du jeden Morgen aufmachst um zu wissen "Was steht an?".

---

## 1. Design-Philosophie

### Jobs-to-be-Done

| Job | Lösung |
|-----|--------|
| "Ich will auf einen Blick sehen, was dieses Quartal ansteht" | Ganzes Quartal sichtbar, visuelle Gruppierung nach Kunde |
| "Ich will schnell einen Meilenstein erfassen" | Inline-Add oder AI-Chat |
| "Ich will verstehen welche Deadlines kritisch sind" | Color-Coding, Countdown-Badges |
| "Ich will Details sehen wenn nötig" | Click-to-Expand Sheet |

### Design-Prinzipien

1. **Information Density richtig**: Viel auf einen Blick, aber nicht chaotisch
2. **Kunden-First**: Einträge sind immer einem Kunden zugeordnet - der Kunde ist das visuelle Anker-Element
3. **Temporal Clarity**: Heute ist IMMER klar erkennbar, Vergangenheit gedimmt
4. **Progressive Disclosure**: Übersicht = minimal, Detail-Sheet = komplett

---

## 2. Datenmodell

### Neue Tabelle: `clients`

```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  logo_url TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_user ON clients(user_id);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
```

### Neue Tabelle: `milestones`

```sql
CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL DEFAULT 'general',
  -- Types: 'contract' | 'kickoff' | 'deadline' | 'meeting' | 'delivery' | 'payment' | 'general'
  date DATE NOT NULL,
  time TIME,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  -- Priority: 'low' | 'medium' | 'high' | 'critical'
  location TEXT,
  attendees TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_milestones_user ON milestones(user_id);
CREATE INDEX idx_milestones_client ON milestones(client_id);
CREATE INDEX idx_milestones_date ON milestones(date);
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
```

### RLS Policies

```sql
-- Clients
CREATE POLICY "Users can CRUD own clients" ON clients
  FOR ALL USING (auth.uid() = user_id);

-- Milestones  
CREATE POLICY "Users can CRUD own milestones" ON milestones
  FOR ALL USING (auth.uid() = user_id);
```

---

## 3. UI-Konzept: "Horizon View"

### Layout-Raster

```text
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │  ← Q4 2025    ┃   Q1 2026   ┃   Q2 →                [+ Meilenstein] [AI Chat]  │
 ├───────────────╋─────────────╋─────────────────────────────────────────────────────┤
 │               ┃ JANUAR      ┃ FEBRUAR              ┃ MÄRZ                        │
 │               ┃─────────────┃──────────────────────┃─────────────────────────────│
 │               ┃     13      ┃     24               ┃     17                      │
 │   Sensoplast  ┃  ● Vertrag  ┃  ● Kick-Off (vor Ort)┃  ⚠ Deadline                │
 │   ━━━━━━━━━━━ ┃             ┃                      ┃                             │
 │               ┃             ┃                      ┃                             │
 │               ┃     28      ┃                      ┃                             │
 │   Acme Corp   ┃  ● Start    ┃                      ┃     05  ● Lieferung        │
 │   ━━━━━━━━━━━ ┃             ┃                      ┃                             │
 │               ┃             ┃                      ┃                             │
 └───────────────┴─────────────┴──────────────────────┴─────────────────────────────┘
```

### Visual Design Tokens

**Milestone-Type Icons + Colors:**

| Type | Icon | Default Color | Semantic |
|------|------|---------------|----------|
| contract | FileSignature | Blue | Formal, legal |
| kickoff | Rocket | Green | Start, energy |
| deadline | AlertTriangle | Red/Orange | Urgency |
| meeting | Users | Purple | Collaboration |
| delivery | Package | Teal | Handoff |
| payment | CreditCard | Emerald | Money |
| general | Circle | Gray | Neutral |

**Kunden-Farben:**
- Jeder Kunde bekommt eine Farbe (aus 12 vordefinierten + Custom)
- Farbe wird als linke Border + dezenter Hintergrund auf der Zeile verwendet
- Ermöglicht sofortige visuelle Zuordnung

**Temporal States:**

| State | Styling |
|-------|---------|
| Past | `opacity-50`, gedimmt |
| Today | `ring-2 ring-primary`, pulsierender Dot |
| Future | Volle Opacity |
| Overdue | `bg-destructive/10`, rote Border |

### Interaktionen

**1. Meilenstein-Karte (Compact)**
```text
┌─────────────────────────────┐
│ 13                          │ ← Tag gross
│ ● Vertragsschluss           │ ← Icon + Titel
│   Sensoplast                │ ← Kunde (klein)
└─────────────────────────────┘
```

**2. Click → Detail Sheet (Bottom Sheet, 60vh)**
```text
┌─────────────────────────────────────────────────────────────────────┐
│  ✕                          Meilenstein bearbeiten                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Vertragsschluss                                    [● Erledigt]   │
│  ───────────────────────────────────────                           │
│                                                                     │
│  📅 13. Januar 2026, 14:00                                         │
│  🏢 Sensoplast                                                     │
│  📍 Vor Ort, München                                               │
│                                                                     │
│  ──────────────────────────────────────────────────────────────── │
│  Beschreibung                                                       │
│  Lorem ipsum dolor sit amet, consectetur adipiscing elit.          │
│                                                                     │
│  Teilnehmer: Max Mustermann, Anna Schmidt                          │
│                                                                     │
│  ──────────────────────────────────────────────────────────────── │
│                                                                     │
│  [ Löschen ]                                    [ Speichern ]      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**3. Quick-Add (Floating Button → Modal)**
```text
┌─────────────────────────────────────────────────────────────────────┐
│  Neuer Meilenstein                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Titel *                                                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │ Deadline Website-Launch                                     │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────────────┐     │
│  │ 📅 17.04.26    │  │ 🕐 Optional   │  │ 🏢 Sensoplast ▼   │     │
│  └────────────────┘  └───────────────┘  └────────────────────┘     │
│                                                                     │
│  Typ                                                                │
│  [ ● Deadline ] [ Kickoff ] [ Vertrag ] [ Meeting ] [ ... ]        │
│                                                                     │
│  [ Abbrechen ]                                    [ Erstellen ]    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. AI-Chat Integration

### AI-Copilot Konzept

**Kein separater Chat-Screen**, sondern ein **Command-Palette-Style Input** der am oberen Rand schwebt:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🤖 "Sensoplast Deadline am 17. April"                              [Enter ↵]  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**AI versteht natürliche Sprache:**
- "Kick-Off mit Acme Corp am 24. Februar, 10 Uhr, vor Ort"
- "Sensoplast Deadline nächsten Freitag"
- "Meeting mit Müller GmbH in 2 Wochen"

**AI Parsing Response (Preview vor Bestätigung):**
```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🤖 Erkannt:                                                                    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📅 24. Februar 2026, 10:00                                              │   │
│  │  🏢 Acme Corp (neuer Kunde)                                             │   │
│  │  📍 Vor Ort                                                              │   │
│  │  Typ: Kick-Off                                                           │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  [ ✕ Abbrechen ]  [ ✎ Anpassen ]                      [ ✓ Erstellen ]         │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Edge Function für AI-Parsing:**

```typescript
// supabase/functions/parse-milestone/index.ts
// Input: { text: string, existingClients: string[] }
// Output: { title, client, date, time?, location?, type }

// Nutzt Lovable AI / Gemini für Natural Language Understanding
// Matcht Kundennamen fuzzy gegen existierende Kunden
// Erkennt relative Datums-Ausdrücke ("nächste Woche", "in 2 Wochen")
```

---

## 5. Quartal-Navigation

### Header-Component

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [←]   Q1 2026   [→]                                          [Heute] [+ Neu]  │
│        Jan – Mär                                                               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Logik:**
- Start: Aktuelles Quartal
- Navigation: Prev/Next Quartal
- "Heute"-Button: Springt zum aktuellen Quartal, scrollt zur heutigen Position
- Quartale: Q1 (Jan-Mär), Q2 (Apr-Jun), Q3 (Jul-Sep), Q4 (Okt-Dez)

### Mobile View

Auf Mobile: **Monat-by-Monat** statt 3 Monate nebeneinander:

```text
┌─────────────────────────────────────────────┐
│  [← Jan]   FEBRUAR 2026   [Mär →]          │
├─────────────────────────────────────────────┤
│                                             │
│  24                                         │
│  ──────────────────────────────────────    │
│  ● Kick-Off (vor Ort)                      │
│    Sensoplast                              │
│                                             │
│  28                                         │
│  ──────────────────────────────────────    │
│  ● Review-Meeting                          │
│    Acme Corp                               │
│                                             │
└─────────────────────────────────────────────┘
```

---

## 6. Empty State + Onboarding

### Erster Besuch

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                                                                 │
│                              📅                                                 │
│                                                                                 │
│                    Deine Projektübersicht                                       │
│                                                                                 │
│     Behalte alle wichtigen Meilensteine im Blick.                              │
│     Verträge, Kick-Offs, Deadlines - alles auf einen Blick.                    │
│                                                                                 │
│                                                                                 │
│     ┌──────────────────────────────────────────────────────────────────────┐   │
│     │ 🤖 "Sensoplast Kick-Off am 15. März"                           [↵]  │   │
│     └──────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│                     oder   [ + Manuell hinzufügen ]                            │
│                                                                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Datei-Struktur

### Neue Dateien

```text
src/
├── pages/app/planning/
│   └── PlanningPage.tsx          # Hauptseite
│
├── components/planning/
│   ├── QuarterCalendar.tsx       # Quartals-Grid (Desktop)
│   ├── MonthView.tsx             # Monats-Ansicht (Mobile)
│   ├── MilestoneCard.tsx         # Kompakte Meilenstein-Karte
│   ├── MilestoneSheet.tsx        # Detail-Sheet
│   ├── MilestoneQuickAdd.tsx     # Quick-Add Modal
│   ├── AICommandInput.tsx        # AI-Eingabe-Feld
│   ├── AIParsePreview.tsx        # AI-Vorschau vor Bestätigung
│   ├── ClientBadge.tsx           # Kunden-Chip mit Farbe
│   ├── QuarterHeader.tsx         # Navigation Header
│   └── PlanningEmptyState.tsx    # Empty State
│
├── hooks/
│   ├── useClients.ts             # CRUD für Kunden
│   ├── useMilestones.ts          # CRUD für Meilensteine
│   └── useQuarterData.ts         # Meilensteine pro Quartal laden
│
├── lib/planning/
│   └── types.ts                  # Client, Milestone Types
│
└── supabase/functions/
    └── parse-milestone/
        └── index.ts              # AI-Parser Edge Function
```

### Änderungen

```text
src/
├── App.tsx                       # Route /app/planning hinzufügen
├── components/layout/AppLayout.tsx  # Nav-Link "Planung" hinzufügen
└── integrations/supabase/types.ts   # (nach Migration automatisch)
```

---

## 8. Migrations

### 001_create_clients.sql

```sql
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  logo_url TEXT,
  contact_email TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_user ON public.clients(user_id);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own clients" ON public.clients
  FOR ALL USING (auth.uid() = user_id);
```

### 002_create_milestones.sql

```sql
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  milestone_type TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL,
  time TIME,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  location TEXT,
  attendees TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_milestones_user ON public.milestones(user_id);
CREATE INDEX idx_milestones_client ON public.milestones(client_id);
CREATE INDEX idx_milestones_date ON public.milestones(date);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own milestones" ON public.milestones
  FOR ALL USING (auth.uid() = user_id);
```

---

## 9. Implementierungs-Reihenfolge

| Phase | Scope | Dateien |
|-------|-------|---------|
| 1 | DB-Schema + Types | Migrations, types.ts |
| 2 | Hooks + Basic CRUD | useClients.ts, useMilestones.ts |
| 3 | Routing + Layout | App.tsx, AppLayout.tsx, PlanningPage.tsx |
| 4 | Quartal-View (Desktop) | QuarterCalendar.tsx, QuarterHeader.tsx |
| 5 | Meilenstein-Karten | MilestoneCard.tsx, ClientBadge.tsx |
| 6 | Detail-Sheet | MilestoneSheet.tsx |
| 7 | Quick-Add Modal | MilestoneQuickAdd.tsx |
| 8 | Mobile View | MonthView.tsx |
| 9 | Empty State | PlanningEmptyState.tsx |
| 10 | AI-Integration | Edge Function, AICommandInput, AIParsePreview |

---

## 10. Design-Referenzen (Benchmark)

- **Linear Roadmap View** - Horizontale Timeline, Client-Grouping
- **Notion Calendar** - Clean Grid, dezente Farben
- **Stripe Dashboard** - Information Density done right
- **Superhuman** - Command Palette AI Input

Das Ergebnis: Ein Tool das du jeden Morgen mit einem Kaffee öffnest, 3 Sekunden draufschaust und sofort weisst was diese Woche ansteht. **Keine Klicks nötig um den Überblick zu bekommen.**

