

## Apple-Level Redesign der Koerperanalyse-Figur

### Design-Philosophie

Die aktuelle Komponente ist funktional gut, aber visuell noch nicht auf Apple-Health-Niveau. Folgende Design-Prinzipien werden angewendet:

**Was Apple anders macht:**
- Extreme Reduktion: Weniger visuelle Elemente, mehr Wirkung
- Typografie-Hierarchie statt Borders/Rahmen als Strukturelement
- Farben sind gedaempft, nie gesaettigt -- Blau wird zu einem sanften Indigo/Teal
- Keine pulsierenden Glow-Effekte (zu "gamer"), stattdessen subtile Schatten-Tiefe
- Segmented Control mit perfekter Pill-Animation (framer-motion layoutId)
- Verbindungslinien (gestrichelt, hauchduenn) von der Figur zu den Karten

### Aenderungen

**Datei: `src/components/bodyscan/AnatomyFigure.tsx`** -- Kompletter visueller Overhaul

#### 1. Segmented Control (Muskel/Fett Toggle)
- Apple-style Pill mit `layoutId` animated Background statt statischer Klassen
- Groessere Touch-Targets, `font-medium` statt `font-xs`
- Sanfter `shadow-sm` auf dem aktiven Pill

#### 2. SegmentCard Redesign
- Borders entfernen, stattdessen `shadow-[0_2px_12px_rgba(0,0,0,0.04)]`
- Groessere Zahlen: `text-2xl font-semibold` mit `tabular-nums` fuer Alignment
- Progress-Bar wird duenner (1px) und eleganter mit abgerundeten Enden
- Diff-Anzeige: Nur farbiger Text + minimaler Pfeil (kein Lucide-Icon, sondern Unicode-Pfeil oder SVG-Chevron)
- `hover:scale` entfernen (Apple animiert nicht bei Hover auf statische Karten)
- Kein `ring` fuer Highest -- stattdessen leicht kraeftigerer Shadow

#### 3. Silhouette SVG
- Strokes komplett entfernen (Apple nutzt gefuellte Formen ohne Outlines)
- Pulsierender Glow-Filter entfernen
- Stattdessen: Segment mit hoechstem Wert bekommt leicht hoeheren `fillOpacity`
- Weichere Radial-Gradients mit groesserem Radius (r="80%")
- Head und Neck als sanft gefuellte Formen statt Strokes (fill mit 8% Opacity)
- Farbpalette: Muskel = `hsl(215, 60%, 58%)` (gedaempftes Blau), Fett = `hsl(12, 55%, 58%)` (warmes Korall statt hartes Rot)

#### 4. Verbindungslinien (Desktop)
- Hauchduenne gestrichelte SVG-Linien (`stroke-dasharray: 4 4`, 0.5px, 10% Opacity) von Figur-Segmenten zu den Karten
- Kleine Punkte (3px Kreise) an den Endpunkten

#### 5. Layout & Spacing
- Desktop: Mehr Abstand zwischen Karten und Figur (`gap-6` statt `gap-3`)
- Trunk-Card breiter (`max-w-[240px]`)
- Card-Padding von `p-4` auf `p-5`
- Gesamte Card bekommt `p-8` Padding im Content-Bereich

#### 6. Animationen
- Spring-Animations beibehalten aber mit weniger `stiffness` (160 statt 200) fuer organischeres Feeling
- Progress-Bar: `ease: [0.32, 0.72, 0, 1]` (Apple-Bezier)
- Keine `AnimatePresence mode="wait"` -- stattdessen sanftes Cross-Fade

#### 7. Farb-Tokens
- Neue lokale Konstanten fuer Apple-Health-Farben:
  - Muscle: `#5E8CE0` (gedaempftes Blau)
  - Fat: `#E07A5F` (warmes Terra)  
  - Good: `#34C759` (Apple Green)
  - Bad: `#FF3B30` (Apple Red)
  - Neutral: muted-foreground

### Nicht geaendert
- Datenlogik (`useMemo`, `latestScan`, `previousScan`) bleibt identisch
- Props-Interface bleibt identisch
- Mobile Layout-Struktur bleibt (Grid 2-spaltig + Trunk)

