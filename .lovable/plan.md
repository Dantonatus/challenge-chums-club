

# Mitarbeiter-Feedback Modul

Ein eigenstaendiges, professionelles Modul zum Sammeln, Strukturieren und Vorbereiten von Mitarbeiter-Feedback -- unabhaengig vom Task-System.

## Konzept

Das Modul folgt einem **Journal-First-Ansatz**: Du legst Mitarbeiter an, schreibst laufend Feedback-Eintraege mit Zeitstempel, und bereitest dich damit auf Feedbackrunden vor. Jeder Mitarbeiter hat ein eigenes Profil mit chronologischer Feedback-Timeline.

### Kern-Workflow

1. Mitarbeiter anlegen (Name, Rolle, optional Farbe/Avatar)
2. Feedback-Eintrag erfassen (Freitext + Datum + Kategorie + Sentiment)
3. In der Timeline sehen, was sich angesammelt hat
4. Vor der Feedbackrunde: Eintraege als "geteilt" markieren

## Informationsarchitektur

```text
/app/feedback
  +-- Mitarbeiter-Liste (linke Spalte, wie Projekte)
  +-- Feedback-Timeline (rechte Spalte)
       +-- Neuer Eintrag (Inline-Capture am oberen Rand)
       +-- Chronologische Eintraege mit Sentiment-Indikator
```

## Datenbankdesign

### Tabelle: `feedback_employees`
| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | Besitzer (auth.uid) |
| name | text | Mitarbeitername |
| role | text | Position/Rolle (optional) |
| color | text | Farbe fuer Avatar |
| is_archived | boolean | Archiviert ja/nein |
| created_at | timestamptz | Erstelldatum |
| updated_at | timestamptz | Aenderungsdatum |

### Tabelle: `feedback_entries`
| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid | PK |
| employee_id | uuid | FK zu feedback_employees |
| user_id | uuid | Besitzer (auth.uid) |
| content | text | Feedback-Text |
| category | text | Kategorie (z.B. 'strength', 'improvement', 'observation', 'goal') |
| sentiment | text | 'positive', 'neutral', 'constructive' |
| entry_date | text | Datum des Feedbacks (YYYY-MM-DD) |
| is_shared | boolean | Wurde in Feedbackrunde geteilt? |
| shared_at | timestamptz | Wann geteilt |
| created_at | timestamptz | Erstelldatum |
| updated_at | timestamptz | Aenderungsdatum |

RLS: Beide Tabellen nur fuer den eigenen user_id lesbar/schreibbar.

## UI-Design

### Layout: Split-View (identisch zum Projekt-Pattern)

**Linke Spalte (240px):**
- Suchfeld oben
- Liste der Mitarbeiter als kompakte Karten mit Farb-Avatar, Name, Rolle, Badge mit Anzahl ungeteilter Eintraege
- "+" Button zum Anlegen
- Archivierte Mitarbeiter ausklappbar unten

**Rechte Spalte (Feedback-Timeline):**
- Header: Mitarbeiter-Name + Rolle + Aktionen (Bearbeiten, Archivieren)
- Inline-Capture: Textfeld + Kategorie-Chips + Sentiment-Toggle + Datum (Default: heute)
- Timeline: Eintraege chronologisch absteigend (neueste oben)
  - Jeder Eintrag: farbiger Sentiment-Punkt (gruen/grau/orange), Datum, Kategorie-Badge, Text, "Geteilt"-Haken
  - Hover: Bearbeiten/Loeschen-Icons
- Leerer Zustand: Illustration + "Erstes Feedback erfassen"

### Kategorien (als Chips)
- **Staerke** -- gruenes Badge
- **Entwicklungsfeld** -- oranges Badge
- **Beobachtung** -- graues Badge
- **Ziel** -- blaues Badge

### Sentiment (3-State-Toggle)
- Positiv (gruener Punkt)
- Neutral (grauer Punkt)
- Konstruktiv (oranger Punkt)

## Komponenten-Struktur

```text
src/pages/app/feedback/
  FeedbackPage.tsx          -- Hauptseite mit Split-View

src/components/feedback/
  EmployeeList.tsx          -- Linke Spalte: Mitarbeiterliste
  EmployeeCard.tsx          -- Einzelner Mitarbeiter in der Liste
  CreateEmployeeDialog.tsx  -- Dialog zum Anlegen
  EditEmployeeDialog.tsx    -- Dialog zum Bearbeiten
  FeedbackTimeline.tsx      -- Rechte Spalte: Timeline + Capture
  FeedbackEntryCapture.tsx  -- Inline-Erfassung neuer Eintraege
  FeedbackEntryCard.tsx     -- Einzelner Eintrag in der Timeline
  FeedbackEmptyState.tsx    -- Leerer Zustand
  CategoryChip.tsx          -- Kategorie-Badge
  SentimentToggle.tsx       -- 3-State Sentiment-Auswahl

src/hooks/
  useFeedbackEmployees.ts   -- CRUD fuer Mitarbeiter
  useFeedbackEntries.ts     -- CRUD fuer Eintraege

src/lib/feedback/
  types.ts                  -- TypeScript-Typen
  constants.ts              -- Kategorien, Sentiments, Farben
```

## Navigation

- Neuer NavLink in AppLayout: "Feedback" mit MessageSquare-Icon
- Route: `/app/feedback` als direkte Child-Route unter `/app`
- Kein Sub-Layout noetig (Single-Page mit Split-View)

## Implementierungsschritte

1. **Datenbank**: Migration fuer `feedback_employees` und `feedback_entries` mit RLS-Policies
2. **Types + Hooks**: TypeScript-Typen, Supabase-Hooks fuer CRUD
3. **UI-Komponenten**: EmployeeList, FeedbackTimeline, Capture-Formular, Entry-Karten
4. **Hauptseite**: FeedbackPage mit Split-View-Layout
5. **Navigation**: Route und NavLink in AppLayout ergaenzen
6. **Polish**: Leere Zustaende, Animationen, responsive Anpassungen

