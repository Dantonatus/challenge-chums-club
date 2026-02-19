

# Hybrid Top-Nav mit "Mehr"-Menu

## Konzept

Die 5 wichtigsten Module bleiben als direkte Links in der Top-Leiste sichtbar. Alle weiteren Module werden in einem "Mehr..."-Dropdown am Ende zusammengefasst. Auf Mobile wird eine kompakte Bottom-Nav mit den Top-5 + Mehr-Button angezeigt.

## Gruppierung

**Primaere Links (immer sichtbar):**
1. Challenges
2. Summary / Uebersicht
3. Entry
4. Tasks
5. Training

**Im "Mehr"-Dropdown:**
- Groups
- Profile
- Recipes
- Planung
- Feedback
- Approval (nur Admin)

## Aenderung: `src/components/layout/AppLayout.tsx`

### Neue Imports
- `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` aus `@/components/ui/dropdown-menu`
- `MoreHorizontal` aus `lucide-react`
- `useIsMobile` aus `@/hooks/use-mobile`

### Datenstruktur

Zwei Arrays definieren:

```text
PRIMARY_NAV = [
  { to: '/app/challenges', label: 'Challenges' },
  { to: '/app/summary',    label: 'Uebersicht' },
  { to: '/app/entry',      label: 'Entry' },
  { to: '/app/tasks',      label: 'Tasks',     icon: ListTodo },
  { to: '/app/training',   label: 'Training',  icon: Dumbbell },
]

SECONDARY_NAV = [
  { to: '/app/groups',    label: 'Groups' },
  { to: '/app/profile',   label: 'Profile' },
  { to: '/app/recipes',   label: 'Recipes',   icon: UtensilsCrossed },
  { to: '/app/planning',  label: 'Planung',   icon: CalendarRange },
  { to: '/app/feedback',  label: 'Feedback',  icon: MessageSquare },
]
```

Approval wird dynamisch in SECONDARY_NAV eingefuegt wenn `userRole === 'admin'`.

### Desktop-Rendering

- Die 5 PRIMARY_NAV Links werden wie bisher als `NavLink` gerendert
- Am Ende kommt ein `DropdownMenu` mit einem "Mehr"-Button (`MoreHorizontal` Icon)
- Das Dropdown zeigt alle SECONDARY_NAV Eintraege als `DropdownMenuItem` mit `NavLink` darin
- Aktiver Sekundaer-Link: Der "Mehr"-Button bekommt die aktive Farbe wenn einer der Sekundaer-Routes aktiv ist
- Dropdown bekommt `bg-popover` Hintergrund (nicht transparent) und hohen `z-50`

### Mobile-Rendering

- Bottom-Nav zeigt die 5 PRIMARY_NAV als Icons
- Letzter Slot ist ein "Mehr"-Button der das gleiche Dropdown oeffnet (nach oben geoeffnet via `side="top"`)

### Visuelle Details

- "Mehr"-Button nutzt das gleiche `linkClass`-Styling wie die anderen Nav-Links
- Wenn ein sekundaerer Link aktiv ist, wird der "Mehr"-Button hervorgehoben (`bg-accent`)
- DropdownMenuContent bekommt `className="bg-popover border z-50"` fuer soliden Hintergrund
- Jeder DropdownMenuItem zeigt Icon (falls vorhanden) + Label

