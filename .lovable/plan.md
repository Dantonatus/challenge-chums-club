

# Kunden-Bearbeitung: Edit Sheet für bestehende Kunden

## Zusammenfassung

Um bestehende Kunden bearbeiten zu können, brauchen wir einen **klickbaren Kundennamen** in der Timeline, der ein Edit-Sheet öffnet - analog zum MilestoneSheet für Meilensteine.

---

## User Experience

### Interaktion

```text
Timeline-Ansicht:
┌─────────────────────────────────────────────────────────────────────────┐
│ Kunden        │ JANUAR      │ FEBRUAR     │ MÄRZ                       │
├───────────────┼─────────────┼─────────────┼────────────────────────────│
│               │             │             │                             │
│ ● Sensoplast  │ ═══════════════════════════════════════                │
│   ← klickbar  │                                                         │
└───────────────┴─────────────────────────────────────────────────────────┘
                ↓
        Click auf Kundenname
                ↓
┌─────────────────────────────────────────────────────────────────────────┐
│  ✕                             Kunde bearbeiten                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Name                                                                   │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Sensoplast                                                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Farbe                                                                  │
│  [ ● ] [ ● ] [ ● ] [ ● ] [ ● ] [ ● ] [ ● ] [ ● ] [ ● ]  ← Farbpalette  │
│                                                                         │
│  ─────────────────────────────────────────────────────────────────────  │
│  Projektzeitraum                                                        │
│  ─────────────────────────────────────────────────────────────────────  │
│                                                                         │
│  ┌─────────────────────┐    ┌─────────────────────┐                    │
│  │ 📅 Projektstart     │    │ 📅 Projektende      │                    │
│  │ 13.01.2026          │    │ 17.04.2026          │                    │
│  └─────────────────────┘    └─────────────────────┘                    │
│                                                                         │
│  Kontakt E-Mail                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ kontakt@sensoplast.de                                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Notizen                                                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Wichtige Ansprechpartnerin: Frau Müller                           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  [ Kunde löschen ]                                    [ Speichern ]    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technische Umsetzung

### 1. Neue Komponente: `ClientEditSheet.tsx`

```typescript
interface ClientEditSheetProps {
  client: Client | null;
  onClose: () => void;
}
```

**Features:**
- Alle bestehenden Client-Felder editierbar: `name`, `color`, `contact_email`, `notes`
- NEU: `start_date` und `end_date` als Date-Picker
- Farbauswahl als visuelle Palette (wie beim Erstellen)
- Löschen mit Bestätigungs-Dialog (soft delete via `is_active = false`)
- Nutzt den bestehenden `updateClient` und `deleteClient` aus `useClients`

### 2. Änderung: `ClientBadge.tsx` klickbar machen

```typescript
interface ClientBadgeProps {
  client: Client;
  size?: 'sm' | 'md';
  compact?: boolean;
  className?: string;
  onClick?: () => void;  // NEU: Optional click handler
}
```

**Styling bei klickbar:**
- `cursor-pointer`
- `hover:bg-muted/50` Feedback
- `rounded-md px-2 py-1` als Touch-Target

### 3. Änderung: Kalender-Komponenten

**QuarterCalendar.tsx** und **HalfYearCalendar.tsx:**
- Neuer Prop: `onClientClick: (client: Client) => void`
- ClientBadge bekommt den Click-Handler

**PlanningPage.tsx:**
- Neuer State: `selectedClient: Client | null`
- Rendert `<ClientEditSheet client={selectedClient} onClose={() => setSelectedClient(null)} />`

---

## Dateien

| Datei | Aktion |
|-------|--------|
| `src/components/planning/ClientEditSheet.tsx` | Neu erstellen |
| `src/components/planning/ClientBadge.tsx` | onClick-Prop hinzufügen |
| `src/components/planning/QuarterCalendar.tsx` | onClientClick durchreichen |
| `src/components/planning/HalfYearCalendar.tsx` | onClientClick durchreichen |
| `src/components/planning/MonthView.tsx` | onClientClick durchreichen |
| `src/pages/app/planning/PlanningPage.tsx` | selectedClient State + Sheet rendern |

---

## Details: ClientEditSheet

### Formular-Felder

| Feld | Typ | Validierung |
|------|-----|-------------|
| Name | Input text | Required, nicht leer |
| Farbe | Farbpalette | Aus CLIENT_COLORS |
| Projektstart | Input date | Optional |
| Projektende | Input date | Optional, >= Projektstart |
| E-Mail | Input email | Optional |
| Notizen | Textarea | Optional |

### Farbpalette

```tsx
<div className="flex flex-wrap gap-2">
  {CLIENT_COLORS.map(color => (
    <button
      key={color}
      onClick={() => setColor(color)}
      className={cn(
        "w-8 h-8 rounded-full border-2 transition-all",
        selectedColor === color 
          ? "border-primary scale-110" 
          : "border-transparent hover:scale-105"
      )}
      style={{ backgroundColor: color }}
    />
  ))}
</div>
```

### Löschen-Flow

1. "Kunde löschen" Button (destructive variant)
2. AlertDialog: "Möchtest du [Name] wirklich löschen? Alle zugehörigen Meilensteine werden ebenfalls entfernt."
3. Bestätigung ruft `deleteClient.mutateAsync(id)` auf
4. Sheet schließt sich

