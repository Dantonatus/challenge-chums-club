
# Fancy AGI Dark Mode Toggle mit 5 rotierenden Effekten

## Konzept & Vision

Ein **spektakulärer Dark Mode Toggle** neben dem Logout-Button mit **5 verschiedenen Übergangseffekten**, die bei jedem Klick abwechselnd durchrotieren.

### Effekt-Rotation

```text
Klick 1 → Matrix Rain
Klick 2 → Liquid Morph  
Klick 3 → Portal Warp
Klick 4 → Glitch Effect
Klick 5 → Particle Explosion
Klick 6 → Matrix Rain (wieder von vorne)
...
```

---

## Die 5 Effekte im Detail

### 1. Matrix Rain (Klassiker)

```text
Visuelle Beschreibung:
+--------------------------------------------------+
|  ░▒▓█ カタカナ 01 ░▒▓█  ░▒▓█ カタカナ 01         |
|    ▓█ 01 タカ ░▒▓█ カタ 01  ▓█ タカ ░▒           |
|  █カタ ░▒▓█ 01 カタ ░▒▓    カタ ░▒▓█ 01          |
|         ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓                          |
|    (Zeichen fließen nach unten mit Trail)        |
+--------------------------------------------------+

Technische Details:
- Canvas-basiert mit 40-60 Spalten
- Zeichen-Set: 0-9, A-Z, カタカナ (Katakana)
- Farbe: Cyan-Gradient #00ff88 → #00ffcc (passt zu Primary)
- Jede Spalte hat eigene Geschwindigkeit (3-8px pro Frame)
- Trail-Effekt: Letzte 10 Zeichen faden von 100% → 10% Opacity
- Dauer: 1.5 Sekunden
- Theme-Switch: Nach 500ms
```

### 2. Liquid Morph (Farbflüssigkeit)

```text
Visuelle Beschreibung:
+--------------------------------------------------+
|                                                  |
|           ████                                   |
|         ████████                                 |
|       ████████████    ← Expandiert vom Button    |
|     ████████████████                             |
|   ████████████████████                           |
|  (Organische, wellenförmige Ränder)              |
+--------------------------------------------------+

Technische Details:
- SVG-basiert mit animierten Bezier-Kurven
- Startet als kleiner Kreis am Button-Position
- Expandiert organisch mit "blob-artigen" Rändern
- Verwendet Perlin Noise für wellige Konturen
- Farbe: 
  - Light→Dark: Dunkles Violett #1a1a2e → Schwarz
  - Dark→Light: Helles Mint #e0fff4 → Weiß
- Ränder haben leichten Glow (box-shadow blur)
- Dauer: 1.2 Sekunden
- Easing: cubic-bezier(0.4, 0, 0.2, 1) für organisches Gefühl

Animation Stages:
0ms    - Kleiner Punkt (5px) erscheint am Button
200ms  - Kreis wächst auf 100px, beginnt zu "wabbeln"
400ms  - Blob erreicht 50% des Screens
600ms  - Theme Switch passiert
800ms  - Blob bedeckt 100% des Screens  
1200ms - Blob "zieht sich zurück" ins Nichts
```

### 3. Portal Warp (Schwarzes Loch)

```text
Visuelle Beschreibung:
+--------------------------------------------------+
|                    ╭─────╮                       |
|                ╭───│     │───╮                   |
|            ╭───│   │  ●  │   │───╮  ← Spirale    |
|            │   │   │     │   │   │               |
|            ╰───│   │     │   │───╯               |
|                ╰───│     │───╯                   |
|                    ╰─────╯                       |
|         (Alles wird zur Mitte gesaugt)           |
+--------------------------------------------------+

Technische Details:
- CSS Transform + Filter basiert
- Zentrum: Bildschirmmitte (oder Button-Position)
- Content wird mit scale() + rotateZ() verzerrt
- Spiralförmige Rotation: 0° → 720° während Warp
- Blur-Effekt verstärkt sich zur Mitte hin (0px → 20px)
- Schwarzer Kreis in der Mitte wächst von 0 → 100vmax
- Farbe Zentrum:
  - Light→Dark: Tiefes Schwarz mit violettem Rand-Glow
  - Dark→Light: Strahlendes Weiß mit goldenem Rand-Glow
- Dauer: 1.8 Sekunden
- Sound-Design (visuell): "Whoosh" Linien die zur Mitte fliegen

Animation Stages:
0ms    - Kleiner schwarzer Punkt erscheint (2px)
300ms  - Content beginnt zu rotieren (subtle, 5°)
500ms  - Schwarzer Kreis wächst, Rotation intensiviert (90°)
700ms  - Content wird "gesaugt" (scale: 0.8)
900ms  - Theme Switch während maximaler Verzerrung
1100ms - Schwarzer Kreis ist fullscreen
1400ms - "Explosion" zurück: Kreis schrumpft schnell
1600ms - Content "ploppt" zurück (scale: 1.05 overshoot)
1800ms - Settle auf Normal-Zustand
```

### 4. Glitch Effect (Digitaler Fehler)

```text
Visuelle Beschreibung:
+--------------------------------------------------+
|████████████████  ← Horizontale "Riss"-Linien     |
|   R G B         ← RGB Kanäle versetzt            |
|░░░░░░░░░░░░░░░░  ← Scan-Lines / Noise            |
|████████████████                                  |
|        ▓▓▓▓▓▓▓▓  ← Zufällige Blöcke verschieben  |
|░░░░░░░░░░░░░░░░                                  |
|    (Alles zittert und verzerrt sich)             |
+--------------------------------------------------+

Technische Details:
- CSS Filter + Pseudo-Elements
- RGB Split: Drei Kopien des Contents
  - Red Channel: translateX(-3px)
  - Green Channel: translateX(0px) (normal)
  - Blue Channel: translateX(+3px)
  - Mix-blend-mode: screen
- Horizontal Slices: 10-15 Streifen die zufällig nach links/rechts versetzt werden
- Scan Lines: Repeating-linear-gradient Overlay (2px lines, 50% opacity)
- Random Blocks: Einige Bereiche flashen weiß/schwarz
- Noise Overlay: SVG turbulence filter
- Zitter-Animation: Schnelle random translate (-2px bis +2px)
- Farben: Cyan, Magenta, Gelb Blitze
- Dauer: 0.8 Sekunden (schnell und aggressiv)

Animation Stages:
0ms    - Erster Glitch-Frame: Alles zittert kurz
100ms  - RGB Split aktiviert (max 5px offset)
200ms  - Horizontale Slices verschieben sich
300ms  - Intensität Maximum: Alles gleichzeitig
400ms  - Theme Switch (versteckt im Chaos)
500ms  - Glitch beginnt abzuklingen
600ms  - RGB kommt zusammen
700ms  - Letzte Zitter
800ms  - Clean State
```

### 5. Particle Explosion (Partikel-Feuerwerk)

```text
Visuelle Beschreibung:
+--------------------------------------------------+
|        ·  *              ·   *                   |
|    *        ·    ✧    ·        *                 |
|  ·    ✧         ●         ✧    ·    ← Button    |
|    *        ·    ✧    ·        *                 |
|        ·  *              ·   *                   |
|                                                  |
|   (Partikel fliegen radial vom Button weg)       |
+--------------------------------------------------+

Technische Details:
- Canvas-basiert für Performance (300-500 Partikel)
- Startpunkt: Button-Position
- Partikel-Typen:
  - Kreise (60%): 2-8px Durchmesser
  - Sterne (20%): 4-zackig, 5-15px
  - Linien (20%): 10-30px Länge, folgen Bewegungsrichtung
- Physik:
  - Initiale Geschwindigkeit: 5-20px pro Frame
  - Gravity: -0.1 (leicht nach oben driftend)
  - Friction: 0.98 (verlangsamen sich)
  - Rotation: Jedes Partikel rotiert individuell
- Farben:
  - Light→Dark: Violett, Blau, Cyan Partikel
  - Dark→Light: Gold, Orange, Rosa Partikel
- Trail-Effekt: Jedes Partikel hinterlässt 5-Frame Trail
- Fade: Opacity 1 → 0 über Lebensdauer
- Dauer: 1.5 Sekunden

Animation Stages:
0ms    - Explosion! Alle Partikel starten vom Button
200ms  - Partikel haben ~30% des Screens erreicht
400ms  - Langsamere Partikel bilden zweite Welle
600ms  - Erste Partikel erreichen Screen-Rand
700ms  - Theme Switch
900ms  - Partikel beginnen zu faden
1200ms - Nur noch wenige Partikel sichtbar
1500ms - Letztes Partikel verschwindet
```

---

## Technische Architektur

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/components/ui/MatrixDarkModeToggle.tsx` | Haupt-Button + Effekt-Orchestrierung |
| `src/components/ui/effects/MatrixRain.tsx` | Canvas: Fallende Zeichen |
| `src/components/ui/effects/LiquidMorph.tsx` | SVG: Organischer Blob |
| `src/components/ui/effects/PortalWarp.tsx` | CSS: Schwarzes Loch Verzerrung |
| `src/components/ui/effects/GlitchEffect.tsx` | CSS: RGB Split + Noise |
| `src/components/ui/effects/ParticleExplosion.tsx` | Canvas: Partikel-System |

### Geänderte Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/layout/AppLayout.tsx` | Toggle neben Logout integrieren |
| `src/index.css` | Transition Utilities + Glitch Keyframes |

---

## State Management

```text
localStorage: "theme-effect-index"

┌─────────────────────────────────────────────────┐
│  useTaskPreferences (theme: light/dark/system)  │
│              ↕                                  │
│  useThemeTransition Hook (NEU)                  │
│  - currentEffectIndex: 0-4                      │
│  - isTransitioning: boolean                     │
│  - triggerTransition(): void                    │
│              ↕                                  │
│  Effect Components (MatrixRain, etc.)           │
└─────────────────────────────────────────────────┘
```

---

## Button Design

```text
┌──────────────────────────────────────┐
│                                      │
│   ☀️/🌙  ← Morphendes Icon           │
│                                      │
│   [Glasmorphism Background]          │
│   [Pulsierender Ring bei Hover]      │
│   [Subtle Particle-Hint Animation]   │
│                                      │
└──────────────────────────────────────┘

Hover-State:
- Kleine Preview-Partikel schweben um Button
- Leuchtet im Accent-Farbton auf
- Tooltip zeigt nächsten Effekt: "Next: Portal Warp"
```

---

## Accessibility

| Situation | Verhalten |
|-----------|-----------|
| `prefers-reduced-motion: reduce` | Einfacher Opacity-Fade (300ms) |
| Keyboard Navigation | Enter/Space triggert Toggle |
| Screen Reader | "Toggle dark mode. Currently light mode." |

---

## Performance Optimierungen

| Technik | Anwendung |
|---------|-----------|
| Canvas für Matrix & Particles | GPU-beschleunigt, keine DOM Manipulationen |
| CSS transforms/opacity only | Keine Layout-Reflows bei Animationen |
| requestAnimationFrame | Smooth 60fps für Canvas-Animationen |
| will-change: transform | Browser-Hint für bessere Performance |
| Lazy Loading | Effekt-Komponenten werden nur bei Bedarf geladen |

---

## Implementierungs-Reihenfolge

1. **Base Hook**: `useThemeTransition` für State + Effect Rotation
2. **MatrixRain**: Canvas-Animation (bereits konzipiert)
3. **LiquidMorph**: SVG Blob-Animation
4. **PortalWarp**: CSS Warp-Effekt
5. **GlitchEffect**: CSS + Filter Animation
6. **ParticleExplosion**: Canvas Partikel-System
7. **MatrixDarkModeToggle**: Haupt-Button mit Effekt-Orchestrierung
8. **Integration**: In AppLayout einbauen
9. **Polish**: Accessibility + reduced-motion Support
