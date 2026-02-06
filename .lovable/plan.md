

# Multi-Projekt Architektur: Elegante, nicht-erschlagende UI

## Kernprinzip: Progressive Disclosure

Der Schlüssel zu einer UI, die nicht erschlägt: **Zeige Komplexität erst, wenn sie gebraucht wird.** Die meisten Kunden haben 1 Projekt. Manche 2-3. Nur Power-User haben 5+.

---

## Phase 1: Datenmodell-Erweiterung

### Neue `projects` Tabelle

```sql
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('planned', 'active', 'completed', 'on_hold', 'cancelled')),
  
  color TEXT,  -- Optional: überschreibt Client-Color
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Migration bestehender Daten

Für jeden Client mit `start_date`/`end_date` wird automatisch ein **Default-Projekt** erstellt. Bestehende Meilensteine werden diesem zugeordnet.

---

## Phase 2: UI-Konzept - "Erschlagungsfrei"

### Prinzip: Inline-Projekt-Erstellung

Statt eines separaten Projekt-Dialogs → **Projekt wird direkt beim Meilenstein-Erstellen angelegt**, wenn gewünscht.

```text
┌────────────────────────────────────────────────────────────────────────┐
│  Neuer Meilenstein                                                ✕   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Titel *                                                               │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Go-Live                                                         │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Kunde *                                                               │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ ● Wolman                                                    ▼  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Projekt                                                      [+ Neu] │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │   Website Relaunch (Jan - Apr)                              ▼  │   │
│  │   E-Commerce Integration (Mai - Sep)                           │   │
│  └────────────────────────────────────────────────────────────────┘   │
│      ↑ Erscheint erst NACHDEM Kunde ausgewählt wurde                  │
│      ↑ Dropdown zeigt bestehende Projekte + "Neues Projekt..."        │
│                                                                        │
│  Datum *               Uhrzeit                                         │
│  ┌────────────────┐    ┌────────────────┐                             │
│  │ 17.04.2025     │    │ 10:00          │                             │
│  └────────────────┘    └────────────────┘                             │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### Inline "Neues Projekt" Flow

Wenn User "Neues Projekt..." wählt, expandiert ein kompaktes Inline-Formular:

```text
│  Projekt                                                               │
│  ┌────────────────────────────────────────────────────────────────────┤
│  │  Neues Projekt                                                     │
│  │  ┌──────────────────────────────────────────────────────────────┐  │
│  │  │ Projektname...                                                │  │
│  │  └──────────────────────────────────────────────────────────────┘  │
│  │                                                                    │
│  │  ┌────────────────┐  ┌────────────────┐                           │
│  │  │ 📅 Start       │  │ 📅 Ende        │                           │
│  │  └────────────────┘  └────────────────┘                           │
│  │                                                                    │
│  │  [Abbrechen]                                       [Erstellen]    │
│  └────────────────────────────────────────────────────────────────────┤
```

---

## Phase 3: Timeline-Darstellung

### Sequentielle Projekt-Balken (empfohlen)

Für eine **kompakte, investor-ready Ansicht**: Projekte sequentiell in einer Zeile pro Kunde.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Wolman       │ JAN  │ FEB  │ MRZ  │ APR  │ MAI  │ JUN  │ JUL  │ AUG  │ SEP  │
│              │                                                              │
│              │███ Website Relaunch ███│░░░ E-Commerce ░░░░░░░░░░░░░░░░░░░░░│
│              │ ● ──────────────── ● ✓ │ ● ────────────────────── ● ─── ⚠  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visuelle Differenzierung

| Status | Darstellung |
|--------|-------------|
| `completed` | Volle Opacity, ✓ am Ende |
| `active` | 20% Opacity (wie bisher) |
| `planned` | Gestrichelt, 10% Opacity |
| `on_hold` | Grau, gepunktet |

### Projekt-Labels auf dem Balken

Bei ausreichend Breite: Projektname direkt auf dem Balken (12px, truncated mit ellipsis).

---

## Phase 4: Client Edit Sheet erweitern

### Projekt-Liste im ClientEditSheet

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Kunde bearbeiten                                                      ✕   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Name                                                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Wolman                                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Farbe                                                                      │
│  [ ● ] [ ● ] [ ● ] [ ● ] [ ● ] ...                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Projekte                                                          [+ Neu] │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ✓ Website Relaunch                            Jan 25 - Apr 25  [✏] │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ ◐ E-Commerce Integration                      Mai 25 - Sep 25  [✏] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  Kontakt E-Mail                                                            │
│  ...                                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Kompakte Liste**: Projektname + Zeitraum + Status-Icon
- **Edit-Icon** öffnet Inline-Editing oder separates Mini-Sheet
- **"+ Neu"** Button für weitere Projekte
- **Max 5 sichtbar**, dann ScrollArea

---

## Implementierungs-Schritte

### Schritt 1: Database Migration
- `projects` Tabelle erstellen
- `milestones.project_id` hinzufügen (nullable für Migration)
- Migration-Script: bestehende `client.start_date/end_date` → Default-Projekt

### Schritt 2: TypeScript Types & Hooks
- `Project` Interface in `types.ts`
- `useProjects(clientId)` Hook für CRUD
- `useMilestones` erweitern: `project_id` statt nur `client_id`

### Schritt 3: MilestoneQuickAdd erweitern
- Projekt-Dropdown (erscheint nach Kunde-Auswahl)
- Inline "Neues Projekt" Formular
- Auto-Zuweisung bei nur 1 Projekt

### Schritt 4: ClientPeriodBar → ProjectsTimeline
- Rendert multiple Projekt-Balken sequentiell
- Projekt-Labels auf Balken
- Status-basiertes Styling

### Schritt 5: ClientEditSheet erweitern
- Projekt-Liste mit CRUD
- Kompakte Inline-Bearbeitung

---

## Dateien & Änderungen

| Datei | Aktion |
|-------|--------|
| `supabase/migrations/xxx_create_projects.sql` | Neue Tabelle + Migration |
| `src/lib/planning/types.ts` | `Project` Interface, Status-Enum |
| `src/integrations/supabase/types.ts` | Automatisch durch Migration |
| `src/hooks/useProjects.ts` | Neuer Hook für Planning-Projekte |
| `src/hooks/useMilestones.ts` | `project_id` Support |
| `src/components/planning/MilestoneQuickAdd.tsx` | Projekt-Auswahl + Inline-Erstellung |
| `src/components/planning/ProjectsTimeline.tsx` | Neu: Ersetzt ClientPeriodBar Logik |
| `src/components/planning/ClientPeriodBar.tsx` | Nutzt ProjectsTimeline intern |
| `src/components/planning/ClientEditSheet.tsx` | Projekt-Liste hinzufügen |
| `src/components/planning/ProjectEditSheet.tsx` | Neues Sheet für Projekt-Details |
| `src/components/planning/QuarterCalendar.tsx` | Neue Datenstruktur nutzen |
| `src/components/planning/HalfYearCalendar.tsx` | Neue Datenstruktur nutzen |

---

## Technische Details

### Namenskonflikt vermeiden

Es existiert bereits `src/hooks/useProjects.ts` für Tasks. Die neue Datei heisst:
- `src/hooks/usePlanningProjects.ts` (eindeutig)

Oder wir nutzen Namespacing:
```typescript
// In usePlanningProjects.ts
export function usePlanningProjects(clientId?: string) { ... }
```

### Datenfluss

```text
PlanningPage
  └── useMilestonesByClient() 
        └── Neuer Return-Typ:
            {
              client: Client,
              projects: [{
                project: Project,
                milestones: Milestone[]
              }]
            }[]
```

### Progressive Disclosure in Action

1. **Neuer User**: Erstellt Kunde → automatisch 1 Default-Projekt
2. **Erster Meilenstein**: Projekt-Dropdown zeigt nur 1 Option → auto-selected
3. **Zweites Projekt nötig**: "+ Neues Projekt" im Dropdown
4. **Power-User**: Volle Projekt-Verwaltung im ClientEditSheet

---

## Erwartetes Ergebnis

| Aspekt | Aktuell | Danach |
|--------|---------|--------|
| Projekte pro Kunde | 1 (implizit) | Beliebig viele |
| UI-Komplexität | - | Minimal durch Progressive Disclosure |
| Timeline-Klarheit | Nur Zeitraum | Projekt-Labels auf Balken |
| Investor-Readiness | Gut | Exzellent (klare Projektphasen) |

