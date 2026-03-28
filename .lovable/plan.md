

## Traumtagebuch — World-Class Dream Journal Module

### Product-Hypothese

Dreams are ephemeral — users wake up and have ~5 minutes before details fade. The JTBD is: **"Capture a dream in under 30 seconds while still half-asleep, then later explore patterns I'd never notice myself."** This means: zero-friction entry (voice-to-text later, but text-first now), rich tagging post-hoc, and AI-powered pattern recognition that surfaces insights over time.

### Was muss es haben?

**Core (MVP):**
- **Speed-Capture**: Titel + Freitext, 1-Tap Stimmung (emoji-basiert), Datum/Uhrzeit auto-filled
- **Klartraum-Toggle**: War es ein luzider Traum? (Boolean)
- **Schlafqualitaet**: 1-5 Slider (wie gut hast du geschlafen?)
- **Tags/Themen**: Freitext-Chips (z.B. "Fliegen", "Verfolgung", "Wasser", "Familie")
- **Emotionen**: Multi-Select aus vordefinierten Emotionen (Angst, Freude, Verwirrung, Trauer, Euphorie, Nostalgie)
- **Wiederkehrend-Marker**: "Diesen Traum hatte ich schon mal"
- **Vivdness-Rating**: Wie lebendig war der Traum? (1-5 Skala)

**Insights (automatisch generiert):**
- **Traum-Frequenz**: Wie oft traegst du ein? Streak-Tracking
- **Emotions-Heatmap**: Welche Emotionen dominieren ueber Zeit (Monat/Woche)
- **Tag-Cloud**: Visuell gewichtete Darstellung der haeufigsten Themen
- **Klartraum-Rate**: Prozentsatz luzider Traeume
- **Schlafqualitaet-Korrelation**: Besser geschlafen = lebendigere Traeume?
- **Wiederkehrende Muster**: Automatische Erkennung haeufiger Tags/Emotionskombinationen
- **Monats-Rueckblick**: Zusammenfassung mit Top-Themen und Stimmungsverlauf

### UI-Konzept: "Nocturnal" Design Language

```text
┌─────────────────────────────────────────────────────┐
│  🌙 Traumtagebuch                    📊 Insights    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─ Quick Capture ─────────────────────────────┐   │
│  │  Was hast du getraeumt?                      │   │
│  │  [ Titel... ]                                │   │
│  │  [ Beschreibung...              ]            │   │
│  │                                              │   │
│  │  Stimmung:  😰 😐 😊 😍 🤯                  │   │
│  │  Vivid:     ○ ○ ● ○ ○                       │   │
│  │  Schlaf:    ★★★★☆                            │   │
│  │  🔮 Luzid   🔁 Wiederkehrend                 │   │
│  │                                              │   │
│  │  Tags: [ + Thema hinzufuegen ]               │   │
│  │  Emotionen: [Angst] [Freude] [Nostalgie] ... │   │
│  │                                    [Speichern]│   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ── Letzte Traeume ──────────────────────────────   │
│  ┌────────┐ ┌────────┐ ┌────────┐                  │
│  │ 🌙     │ │ 🔮     │ │ 🌙     │                  │
│  │Flug    │ │Ozean   │ │Haus    │                  │
│  │😍 ████ │ │😰 ██   │ │😊 ███  │                  │
│  │vor 1d  │ │vor 3d  │ │vor 5d  │                  │
│  └────────┘ └────────┘ └────────┘                  │
│                                                     │
│  ── Insights Strip ──────────────────────────────   │
│  [ 12 Traeume ] [ 3🔮 Luzid ] [ Top: Fliegen ]    │
│  [ Ø Schlaf: 3.8★ ] [ 5-Tage Streak 🔥 ]          │
└─────────────────────────────────────────────────────┘
```

**Insights-Page (Tab):**
```text
┌─────────────────────────────────────────────────────┐
│  Emotions-Verlauf (Area Chart, gestapelt)           │
│  ████████████████████████████████████████            │
│  Angst ░░░ Freude ███ Nostalgie ▓▓▓                │
├─────────────────────────────────────────────────────┤
│  Tag-Cloud (interaktiv, groesse = haeufigkeit)      │
│       Fliegen    Wasser                             │
│    Familie    Verfolgung   Haus                     │
│         Arbeit      Tiere                           │
├─────────────────────────────────────────────────────┤
│  Klartraum-Rate        Vivdness Trend               │
│  ┌──────────┐          ┌──────────────┐             │
│  │  25% 🔮  │          │  ▁▃▅▇▅▃▅▇█  │             │
│  │ 3/12     │          │  Ø 3.2       │             │
│  └──────────┘          └──────────────┘             │
├─────────────────────────────────────────────────────┤
│  Schlafqualitaet vs. Vivdness (Scatter)             │
│  ● ●    ●                                           │
│     ● ●    ●  ●                                     │
│  → Korrelation: +0.6 (besser Schlaf = vivider)      │
└─────────────────────────────────────────────────────┘
```

### Interaktive Features

- **Mood-Morph Animation**: Beim Tippen der Stimmung morpht der Hintergrund-Gradient (framer-motion) — dunkelblau/lila fuer Angst, warm-gold fuer Freude, tuerkis fuer Nostalgie
- **Vivdness-Slider mit Glow**: Je hoeher die Vivdness, desto staerker leuchtet ein Halo um die Karte
- **Tag-Cloud mit Physics**: Tags schweben leicht und reagieren auf Hover (scale + glow)
- **Dream-Streak Fire**: Animierte Flamme bei aktiven Streaks
- **Card-Flip auf Detail**: Traum-Karten flippen bei Klick (3D-Rotate) zur Detail-Ansicht

### Datenbank

```sql
CREATE TABLE public.dream_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  content text,                        -- Freitext-Beschreibung
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time DEFAULT CURRENT_TIME,
  mood text,                           -- 'anxious','neutral','happy','excited','mindblown'
  vividness smallint,                  -- 1-5
  sleep_quality smallint,              -- 1-5
  is_lucid boolean DEFAULT false,
  is_recurring boolean DEFAULT false,
  emotions text[],                     -- ['fear','joy','nostalgia','confusion',...]
  tags text[],                         -- freie Tags
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dream_entries ENABLE ROW LEVEL SECURITY;
-- Standard CRUD policies: auth.uid() = user_id
```

### Frontend-Dateien

| Datei | Inhalt |
|---|---|
| `src/lib/dreams/types.ts` | Typen, Mood/Emotion-Definitionen, Konstanten |
| `src/hooks/useDreamEntries.ts` | CRUD-Hook mit TanStack Query |
| `src/pages/app/dreams/DreamJournalPage.tsx` | Hauptseite mit Tabs (Erfassen / Timeline / Insights) |
| `src/components/dreams/DreamCapture.tsx` | Quick-Capture-Formular mit Mood-Morph |
| `src/components/dreams/DreamCard.tsx` | Traum-Karte mit Glow + Flip-Animation |
| `src/components/dreams/DreamDetailSheet.tsx` | Detail/Edit-Sheet |
| `src/components/dreams/DreamTimeline.tsx` | Chronologische Liste mit Streak-Anzeige |
| `src/components/dreams/DreamInsights.tsx` | Analytics-Dashboard (Charts, Tag-Cloud, Korrelationen) |
| `src/components/dreams/MoodSelector.tsx` | Emoji-basierter Mood-Picker mit Morph-Animation |
| `src/components/dreams/EmotionChips.tsx` | Multi-Select Emotion-Chips |
| `src/components/dreams/TagCloud.tsx` | Gewichtete, interaktive Tag-Wolke |
| `src/components/dreams/VividnessSlider.tsx` | Custom Slider mit Glow-Effekt |

### Navigation

- Neuer Eintrag in `PRIMARY_NAV`: `{ to: "/app/dreams", label: "Dreams", icon: Moon }`
- Route: `<Route path="dreams" element={<DreamJournalPage />} />`

### Design-Entscheidungen

- **Farbwelt**: Dunkle Blau-/Lila-Toene als Akzent (naechtliche Atmosphaere), funktioniert in Light + Dark Mode
- **Typografie**: Titel in `font-serif` (traumhaft, literarisch), Rest system sans
- **Glassmorphism**: Capture-Card mit `backdrop-blur-xl bg-card/60`
- **Motion**: Staggered fade-in fuer Timeline, morphende Gradienten beim Mood-Switch

