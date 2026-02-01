
# Fancy AGI Matrix Dark Mode Toggle

## Konzept & Vision

Ein **spektakulärer Dark Mode Toggle** neben dem Logout-Button mit einem einzigartigen "Matrix Rain" Übergangseffekt, der beim Aktivieren über den gesamten Bildschirm fließt.

### Was macht ihn besonders?

1. **Der Button selbst**
   - Morphendes Icon: Sonne ↔ Mond mit fließender Animation
   - Pulsierender Glow-Ring bei Hover
   - Glasmorphism-Effekt mit leichtem Backdrop-Blur
   - Subtle "Digital Noise" Textur im Hintergrund

2. **Der Matrix Rain Übergang** (Das Highlight!)
   - Beim Klick erscheint ein fullscreen Overlay
   - Grüne/Cyan-farbene Zeichen (wie im Film "The Matrix") fließen von oben nach unten
   - Die Zeichen sind random: Zahlen, Buchstaben, japanische Katakana
   - Nach ~1.5 Sekunden "zerfällt" der Rain und der neue Theme wird revealed
   - Sound-lose, aber visuell beeindruckend

3. **Smooth Theme Transition**
   - Alle Farben morphen sanft via CSS transitions
   - Der Matrix-Effekt maskiert den harten Farbwechsel elegant

---

## Technische Umsetzung

### Neue Dateien

| Datei | Zweck |
|-------|-------|
| `src/components/ui/MatrixDarkModeToggle.tsx` | Der Button + Matrix Rain Animation |
| `src/components/ui/MatrixRain.tsx` | Die Canvas-basierte Matrix-Animation |

### Änderungen an bestehenden Dateien

| Datei | Änderung |
|-------|----------|
| `src/components/layout/AppLayout.tsx` | Toggle neben Logout-Button integrieren |
| `src/index.css` | Zusätzliche Transition-Utilities für smooth theme morphing |

---

## Detailliertes Design

### MatrixRain Komponente

```text
+--------------------------------------------------+
|  ░ ▒ ▓ █ カ タ カ ナ 0 1 0 1 ░ ▒ ▓ █             |
|    ▓ █ 0 1 タ カ ░ ▒ ▓ █ カ タ 0 1               |
|  █ カ タ ░ ▒ ▓ █ 0 1 カ タ ░ ▒ ▓                 |
|    (Zeichen fließen nach unten)                  |
|         ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓                          |
+--------------------------------------------------+
```

**Technologie:** HTML5 Canvas mit requestAnimationFrame
- ~30-50 Spalten mit fallenden Zeichen
- Verschiedene Fallgeschwindigkeiten für Tiefe
- Fading Trail-Effekt (ältere Zeichen werden dunkler)
- Farbe: Cyan/Mint `#00ff88` bis `#00ffcc` (passt zum Primary-Accent)

### Toggle Button Design

```text
Light Mode:                    Dark Mode:
+-------------------------+    +-------------------------+
|  ☀️  [pulsing glow]     |    |  🌙  [starfield glow]   |
|  backdrop-blur          |    |  backdrop-blur          |
|  ring-2 ring-primary/30 |    |  ring-2 ring-primary/50 |
+-------------------------+    +-------------------------+
```

**States:**
- `idle`: Subtiler Glow
- `hover`: Intensiverer Glow + Scale 1.1
- `active`: Matrix Rain wird getriggert

### Animations-Flow

```text
1. User klickt Button
         ↓
2. Matrix Rain Overlay erscheint (AnimatePresence)
         ↓
3. Nach 500ms: Theme wechselt (class toggle)
         ↓
4. Nach 1500ms: Rain "zerfällt" (opacity fade)
         ↓
5. Overlay entfernt, neues Theme ist aktiv
```

---

## Code-Architektur

### MatrixDarkModeToggle.tsx

```tsx
// Hauptkomponente mit:
// - useState für isTransitioning
// - Framer Motion für Button-Animationen
// - AnimatePresence für Matrix-Overlay
// - useTaskPreferences Hook für Theme-State
```

### MatrixRain.tsx

```tsx
// Canvas-Komponente mit:
// - useRef für Canvas-Element
// - useEffect mit requestAnimationFrame Loop
// - Konfigurierbare Props: duration, columnCount, colors
// - Cleanup bei unmount
```

### CSS Erweiterungen

```css
/* Smooth theme transitions */
body {
  transition: background-color 0.5s ease, color 0.3s ease;
}

/* Matrix glow effect */
.matrix-glow {
  animation: matrix-pulse 2s infinite;
  box-shadow: 0 0 20px hsl(160 100% 50% / 0.4);
}
```

---

## Warum dieser Ansatz?

| Aspekt | Vorteil |
|--------|---------|
| **Einzigartigkeit** | Matrix-Effekt ist iconic, aber selten als Theme-Toggle |
| **Performance** | Canvas ist GPU-beschleunigt, smooth auch auf Mobile |
| **Bestehende Patterns** | Nutzt bereits vorhandenes framer-motion |
| **Theme-System** | Integriert nahtlos mit bestehendem useTaskPreferences |
| **Accessibility** | Respektiert `prefers-reduced-motion` (dann einfacher Fade) |

---

## Alternative Effekte (falls gewünscht)

Falls der Matrix-Effekt zu viel ist, hier Alternativen:

1. **Liquid Morph**: Farbflüssigkeit die sich ausbreitet
2. **Portal Warp**: Schwarzes Loch das sich öffnet und schließt
3. **Glitch Effect**: Kurzer digitaler Glitch-Übergang
4. **Particle Explosion**: Partikel die vom Button explodieren

---

## Nächste Schritte nach Approval

1. MatrixRain Canvas-Komponente erstellen
2. MatrixDarkModeToggle Button-Komponente erstellen
3. In AppLayout neben Logout integrieren
4. CSS Transitions für smoothe Theme-Übergänge hinzufügen
5. Testen auf Desktop und Mobile

