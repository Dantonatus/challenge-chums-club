

# Anatomie-Figur: Apple-Level Premium Redesign

## Problem

Die aktuelle SVG-Figur ist primitiv -- grobe Pfade, winzige Labels die abgeschnitten werden, keine Segment-Namen sichtbar, keine Entwicklung (Diff), und insgesamt weit entfernt von professionellem Design.

## Neues Konzept: HTML-First mit minimaler SVG-Silhouette

Komplett anderer Ansatz inspiriert von Apple Health / Apple Fitness+:

### Layout-Architektur

Die gesamte Darstellung wird **HTML/CSS-basiert** mit einer kleinen, eleganten SVG-Silhouette nur als visueller Anker in der Mitte. Alle Daten leben in sauber gestalteten HTML-Karten.

```text
+------------------------------------------------------------------+
| Koerperanalyse                               [Muskel] [Fett]     |
+------------------------------------------------------------------+
|                                                                    |
|  +-- Arm L -------+                      +-- Arm R -------+      |
|  | Linker Arm     |                      | Rechter Arm    |      |
|  | 1.0 kg         |     +---------+      | 4.4 kg         |      |
|  | [======--] 14% |     |         |      | [========] 61% |      |
|  | +0.1           |     |  Human  |      | -0.2           |      |
|  +-----------------+     | Figure  |      +-----------------+     |
|                          | (SVG)   |                              |
|  +-- Bein L ------+     |         |      +-- Bein R ------+      |
|  | Linkes Bein    |     |         |      | Rechtes Bein   |      |
|  | 5.0 kg         |     +---------+      | 11.7 kg        |      |
|  | [========-] 69%|                      | [=========] 100|      |
|  | -0.2           |    +-- Rumpf --+     | +0.5           |      |
|  +-----------------+    | Rumpf    |     +-----------------+      |
|                         | 38.5 kg  |                              |
|                         | [====] 100%                             |
|                         | +0.3     |                              |
|                         +----------+                              |
+------------------------------------------------------------------+
```

### SVG-Silhouette: Minimalistisch und edel

- **Nur Outline** -- keine gefuellten Flaechen im SVG selbst
- Elegante, duenne Linien (1-1.5px) in `muted-foreground` mit niedriger Opazitaet
- Anatomisch proportionale Bezier-Kurven: natuerliche Schultern, Taille, Hueften
- Segmente werden durch **subtile Gradient-Fills** hervorgehoben -- radiale Gradients die von innen nach aussen ausstrahlen
- Segment-Grenzen sind **unsichtbar** -- die Figur wirkt als Ganzes, die Farbe "fliesst" in die Bereiche
- Kopf als perfekter Kreis, Hals als sanfte Verjuengung

### SegmentInfoCard -- Glassmorphism-Karten

Jede Karte zeigt:
1. **Segment-Name** (z.B. "Linker Arm") -- `text-xs text-muted-foreground uppercase tracking-wider`
2. **Wert** gross und klar -- `text-xl font-semibold` mit Einheit in `text-muted-foreground`
3. **Relativer Fortschrittsbalken** -- duenner, abgerundeter Balken mit Gradient-Fill, Breite = `wert / maxWert * 100%`
4. **Diff-Badge** -- Kleiner Pfeil + Wert, gruen (Muskel+/Fett-) oder rot (Muskel-/Fett+), mit `text-xs`

Karten-Stil:
- `backdrop-blur-xl bg-card/60 border border-border/50 rounded-2xl`
- Hover: `scale-[1.02]` + leicht erhoehte Border-Opazitaet
- Schatten: `shadow-sm` im Light Mode, kein Schatten im Dark Mode

### Animationen (framer-motion)

1. **Silhouette**: Fade-in mit `opacity: 0 -> 1` ueber 600ms
2. **Segment-Fills**: Staggered von Kopf nach Fuss (0, 100, 200, 300, 400ms)
3. **Info-Cards**: Slide-in von links/rechts mit leichtem Spring-Effekt (`type: "spring", stiffness: 200, damping: 20`)
4. **Mode-Toggle**: Farben morphen smooth via `animate` key change -- kein harter Schnitt
5. **Hoechstes Segment**: Subtiler aeusserer Glow-Pulse (3s Zyklus, sehr dezent)
6. **Progress-Balken**: Breite animiert von 0% zum Zielwert ueber 800ms mit `ease-out`

### Responsive

- **Desktop (>= 768px)**: CSS Grid mit `grid-template-areas` -- Arms links/rechts, Figur mittig, Beine unten links/rechts, Rumpf unten mittig
- **Mobile (< 768px)**: Figur oben zentriert (kleiner), alle 5 Cards als vertikale Liste darunter

### Farbsystem

```text
Muskel-Modus:
  Gradient: hsl(210 85% 60%) -> hsl(210 70% 45%) radial
  Opazitaet: 0.2 + 0.8 * intensity
  Progress-Bar: bg-gradient von hsl(210 80% 55%) zu hsl(210 90% 70%)

Fett-Modus:
  Gradient: hsl(0 75% 58%) -> hsl(0 60% 45%) radial
  Opazitaet: 0.2 + 0.8 * intensity
  Progress-Bar: bg-gradient von hsl(0 70% 55%) zu hsl(0 80% 68%)

Hoechstes Segment: Zusaetzlicher SVG feGaussianBlur Glow-Filter
```

## Technische Umsetzung

### Datei: `src/components/bodyscan/AnatomyFigure.tsx` (Komplett neu)

**Komponenten-Struktur:**

```text
AnatomyFigure ({ scans })
  |-- Card mit CardHeader (Titel + Mode-Toggle)
  |-- CardContent
       |-- Desktop: CSS Grid Container
       |    |-- SegmentCard "Linker Arm" (grid-area: armL)
       |    |-- SegmentCard "Rechter Arm" (grid-area: armR)
       |    |-- SVG Silhouette (grid-area: figure, row-span)
       |    |-- SegmentCard "Linkes Bein" (grid-area: legL)
       |    |-- SegmentCard "Rechtes Bein" (grid-area: legR)
       |    |-- SegmentCard "Rumpf" (grid-area: trunk)
       |
       |-- Mobile: Figur + gestackte Card-Liste

SegmentCard ({ name, value, unit, intensity, diff, mode, delay, isHighest })
  |-- motion.div (entry-animation)
       |-- Segment-Name (uppercase, tracking-wide)
       |-- Wert + Einheit
       |-- Progress-Bar (animierte Breite)
       |-- Diff-Badge (optional, farbig)
```

**SVG-Silhouette (200x400 viewBox):**

- Kopf: Perfekter Kreis `(100, 28) r=18`
- Hals: Sanfte Trapezform
- Schultern: Natuerliche Bezier-Kurven
- Torso: Leichte Taillierung
- Arme: Anatomisch korrekt, leicht gebeugt
- Beine: Natuerliche Form mit Knie-Andeutung
- Fuesse: Minimale Andeutung

Jedes Segment bekommt:
- `<radialGradient>` mit dynamischer Farbe + Opazitaet basierend auf Mode und Intensitaet
- Smooth-animierte Fill-Farbe beim Mode-Wechsel
- Hover: Leichtes Aufhellen (+10% Lightness)

**Datenfluss (unveraendert):**
- `latestScan(scans)` fuer aktuelle Werte
- `previousScan(scans)` fuer Diff-Berechnung
- `segments_json === null` -> return null
- Relative Intensitaet = `wert / max(alle 5)`

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/bodyscan/AnatomyFigure.tsx` | Komplett neu: HTML/CSS Grid Layout, Glassmorphism SegmentCards mit Name/Wert/Progress/Diff, elegante SVG-Silhouette mit radialen Gradients, staggered Spring-Animationen, responsive Desktop/Mobile |

Keine weiteren Dateien betroffen -- die Integration in BodyScanPage.tsx ist bereits korrekt.

