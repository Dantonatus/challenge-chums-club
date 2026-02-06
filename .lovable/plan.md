
# Fix: Export zeigt leere weiße Fläche

## Root Cause Analyse

Der aktuelle Export-Code hat einen fundamentalen Bug:

```typescript
// PROBLEM: Clone wird erstellt und offscreen platziert
const clone = element.cloneNode(true) as HTMLElement;
clone.style.position = 'absolute';
clone.style.left = '-9999px';  // <-- Offscreen!

// toPng wird auf dem Clone aufgerufen
const dataUrl = await toPng(clone, { ... });
```

**Warum das nicht funktioniert:**
1. `html-to-image` verwendet `foreignObject` in einem SVG, das dann zu Canvas konvertiert wird
2. Der Clone ist bei `-9999px` und wird vom Browser **nicht gerendert** (Paint wird übersprungen)
3. CSS Variables (`var(--background)` etc.) werden im Clone nicht aufgelöst, weil er nicht im sichtbaren DOM-Kontext ist
4. Das Ergebnis: Weißes/leeres Bild

## Lösung

**Strategie ändern: Direkt auf dem Original-Element arbeiten, NICHT auf einem Clone.**

Die `toPng`-Funktion aus `html-to-image` erstellt intern bereits einen Clone. Wir müssen einfach das Original-Element übergeben und die Bibliothek ihre Arbeit machen lassen.

## Implementierungsplan

### Schritt 1: exportCanvas.ts komplett vereinfachen

```typescript
export async function exportPlanningCanvas({
  elementId,
  format,
  filename,
  periodLabel,
}: ExportOptions): Promise<void> {
  // 1. Element finden (Wrapper first für Label-Overflow)
  const wrapperElement = document.getElementById(`${elementId}-export-wrapper`);
  const element = wrapperElement || document.getElementById(elementId);

  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // 2. Fonts laden (wichtig für korrektes Rendering)
  await document.fonts?.ready;

  // 3. DIREKT toPng auf dem Original-Element aufrufen
  //    html-to-image klont intern und handhabt CSS korrekt
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,  // Retina-Qualität
    // KEIN backgroundColor - übernimm exakt was auf Screen ist
    style: {
      // Entferne Animationen für statisches Bild
      animation: 'none',
      transition: 'none',
    },
    filter: (node) => {
      // Entferne animate-pulse Elemente (pulsierender Punkt)
      if (node instanceof HTMLElement) {
        return !node.classList.contains('animate-pulse');
      }
      return true;
    },
  });

  if (format === 'png') {
    downloadPNGFromDataUrl(dataUrl, filename);
  } else {
    const canvas = await dataUrlToCanvas(dataUrl);
    downloadPDFFromCanvas(canvas, filename, periodLabel);
  }
}
```

### Schritt 2: Scroll-Bereich Flatten (für "Gesamte Liste")

Da der User "Gesamte Liste" will, müssen wir die ScrollArea temporär expandieren:

```typescript
export async function exportPlanningCanvas({ ... }): Promise<void> {
  const element = ... // wie oben

  // ScrollArea temporär expandieren für vollständigen Export
  const scrollAreas = element.querySelectorAll('[data-radix-scroll-area-viewport]');
  const originalStyles = new Map<HTMLElement, { overflow: string; height: string; maxHeight: string }>();
  
  scrollAreas.forEach((el) => {
    const viewport = el as HTMLElement;
    originalStyles.set(viewport, {
      overflow: viewport.style.overflow,
      height: viewport.style.height,
      maxHeight: viewport.style.maxHeight,
    });
    viewport.style.overflow = 'visible';
    viewport.style.height = 'auto';
    viewport.style.maxHeight = 'none';
  });

  // Warten bis Layout recalculated wurde
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

  try {
    const dataUrl = await toPng(element, { ... });
    // ... export
  } finally {
    // Original-Styles wiederherstellen
    originalStyles.forEach((styles, el) => {
      el.style.overflow = styles.overflow;
      el.style.height = styles.height;
      el.style.maxHeight = styles.maxHeight;
    });
  }
}
```

### Schritt 3: Theme-Aware Export

Da der User "Wie Bildschirm" will, entfernen wir die erzwungene `backgroundColor: '#ffffff'`:

```typescript
const dataUrl = await toPng(element, {
  cacheBust: true,
  pixelRatio: 2,
  // Kein backgroundColor - übernimmt automatisch den Theme-Hintergrund
  filter: (node) => {
    if (node instanceof HTMLElement) {
      // Filter: Keine pulsierenden Elemente
      if (node.classList.contains('animate-pulse')) return false;
    }
    return true;
  },
});
```

### Schritt 4: Calendar-Wrapper anpassen

Die Calendar-Komponenten haben einen Wrapper mit erzwungenem weißen Hintergrund. Das muss entfernt werden:

**HalfYearCalendar.tsx & QuarterCalendar.tsx:**
```tsx
// VORHER:
<div id="planning-chart-export-wrapper" className="p-6 -m-6" style={{ backgroundColor: '#ffffff' }}>

// NACHHER: Kein erzwungener Hintergrund
<div id="planning-chart-export-wrapper" className="p-6 -m-6">
```

Das `bg-card` auf dem inneren Element übernimmt automatisch das korrekte Theme.

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `exportCanvas.ts` | Komplett neu: Kein manueller Clone, direkt `toPng` auf Original, ScrollArea temporär flatten, Theme-aware |
| `HalfYearCalendar.tsx` | Entferne `style={{ backgroundColor: '#ffffff' }}` vom Wrapper |
| `QuarterCalendar.tsx` | Entferne `style={{ backgroundColor: '#ffffff' }}` vom Wrapper |

## Erwartetes Ergebnis

1. **PNG-Export**: Exakt 1:1 wie auf dem Bildschirm (inkl. Dark/Light Mode)
2. **PDF-Export**: Das PNG im A4-Landscape mit minimalem Header
3. **Gesamte Liste**: Alle Clients werden exportiert, auch gescrollte
4. **Theme-Aware**: Dark Mode = Dark Export, Light Mode = Light Export
