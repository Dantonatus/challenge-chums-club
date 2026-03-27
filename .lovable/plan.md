

## Neues Modul: "Favorites" -- persoenliche Sammlung

Ein neues Modul zum schnellen Erfassen von Lieblingsliedern, Filmen, Serien, Buechern, Pflanzen und mehr. Der Fokus liegt auf **Speed-to-Entry** (Titel tippen, Kategorie waehlen, fertig) mit der Option, spaeter Details zu ergaenzen.

### Konzept

**Schnelleingabe** (< 5 Sekunden): Ein Eingabefeld oben auf der Seite -- Titel eingeben, Kategorie-Chip antippen, Enter. Fertig. Aehnlich wie die QuickAdd-Leiste bei Tasks.

**Optionale Details** (Sheet/Drawer bei Klick auf Eintrag):
- Kurznotiz / Warum es dir gefaellt
- Bewertung (1-5 Sterne oder Herzen)
- Bild-URL (Cover, Poster)
- Kuenstler / Autor / Regisseur
- Genre / Tags
- Status (z.B. "gelesen", "will ich sehen", "Favorit")

**Kategorien** (erweiterbar):
- 🎵 Musik
- 🎬 Filme
- 📺 Serien
- 📚 Buecher
- 🌱 Pflanzen
- 🎮 Spiele
- 🍽️ Restaurants
- ✨ Sonstiges

**Empfohlene Zusatz-Features:**
- **Timeline-Ansicht**: Wann wurde was hinzugefuegt -- chronologische Uebersicht
- **Kategorie-Filter**: Chips oben zum schnellen Filtern nach Typ
- **Suche**: Volltextsuche ueber alle Eintraege
- **Statistiken**: Wie viele Eintraege pro Kategorie, letzter Eintrag, aktivster Monat
- **Sortierung**: Nach Datum, Bewertung, Name
- **Favoriten-Export**: Teilen als Liste

### Datenbank

Neue Tabelle `favorites`:

```sql
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL,           -- 'music', 'movie', 'series', 'book', 'plant', 'game', 'restaurant', 'other'
  title text NOT NULL,
  subtitle text,                     -- Kuenstler, Autor, Regisseur etc.
  rating smallint,                   -- 1-5, optional
  note text,                         -- persoenliche Notiz
  image_url text,                    -- Cover/Poster URL
  status text DEFAULT 'favorite',    -- 'favorite', 'want', 'done'
  tags text[],                       -- freie Tags
  metadata jsonb,                    -- erweiterbare Zusatzinfos (Genre, Jahr etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
-- CRUD-Policies fuer auth.uid() = user_id (analog zu anderen Tabellen)
```

### Frontend-Dateien

| Datei | Inhalt |
|---|---|
| `src/pages/app/favorites/FavoritesPage.tsx` | Hauptseite mit QuickAdd, Filter-Chips, Eintrags-Grid |
| `src/components/favorites/QuickAddFavorite.tsx` | Eingabefeld + Kategorie-Chips (1-Zeile-Erfassung) |
| `src/components/favorites/FavoriteCard.tsx` | Karte pro Eintrag (Titel, Kategorie-Icon, Datum, Rating) |
| `src/components/favorites/FavoriteDetailSheet.tsx` | Sheet zum Bearbeiten/Erweitern eines Eintrags |
| `src/components/favorites/CategoryFilter.tsx` | Filter-Chips fuer Kategorien |
| `src/hooks/useFavorites.ts` | CRUD-Hook (useQuery/useMutation) |
| `src/lib/favorites/types.ts` | TypeScript-Typen und Kategorie-Definitionen |

### Navigation

- Neuer Eintrag in `PRIMARY_NAV` im AppLayout: `{ to: "/app/favorites", label: "Favorites", icon: Heart }`
- Route in `App.tsx`: `<Route path="favorites" element={<FavoritesPage />} />`

### UI-Skizze

```text
┌─────────────────────────────────────────────┐
│  ❤️ Favorites                    🔍 Suche   │
├─────────────────────────────────────────────┤
│  [ Titel eingeben... ]  🎵 🎬 📺 📚 🌱 ✨  │  ← QuickAdd
├─────────────────────────────────────────────┤
│  Alle | 🎵 Musik | 🎬 Filme | 📺 Serien.. │  ← Filter
├─────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ 🎵       │  │ 🎬       │  │ 📚       │  │
│  │ Song XY  │  │ Film AB  │  │ Buch CD  │  │
│  │ ★★★★☆   │  │ ★★★★★   │  │ vor 2d   │  │
│  │ vor 3d   │  │ vor 1w   │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Zusammenfassung

- 1 neue DB-Tabelle mit RLS
- 1 neue Seite + 5 Komponenten + 1 Hook + 1 Types-Datei
- Navigation + Route ergaenzen
- Kein Backend/Edge-Function noetig -- rein Client-seitig mit Supabase SDK

