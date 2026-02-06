

# Pixel-Perfekte Analyse & Behebungsplan: Export-Qualität

## Detaillierte Problem-Analyse

### Aus dem PNG-Export identifizierte Fehler

```
VISUELLES AUDIT - Identifizierte Probleme:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PROBLEM 1: Label-Text wird ABGESCHNITTEN
├─ Beispiele: "Datenanforderung CIO Wa..." (Wagon), "Kick-off & technische..." (Wein Wolf)
├─ Root Cause: line-clamp-2 + maxWidth: 100px schneidet zu aggressiv ab
└─ Impact: Kritische Information geht verloren - unbrauchbar für Präsentationen

PROBLEM 2: Text-ÜBERLAPPUNG bei nahen Meilensteinen
├─ Beispiele: "5. Feb." & "27. Feb." bei Wagon überlappen horizontal
├─ Root Cause: 12% Threshold greift nicht, weil Abstand 22 Tage bei 180 = 12.2%
└─ Impact: Unleserlich, unprofessionell

PROBLEM 3: Verbindungslinien FEHLEN KOMPLETT im Export
├─ Beobachtung: Im PNG/PDF sind keine vertikalen Striche zwischen Label und Icon sichtbar
├─ Root Cause: `bg-muted-foreground/40` (rgba mit Opacity) wird von html2canvas nicht korrekt erfasst
└─ Impact: Keine visuelle Verbindung zwischen Text und Meilenstein

PROBLEM 4: Labels sind nicht auf gleicher Höhe bei BELOW-Position
├─ Beispiele: "16. Apr." bei Wein Wolf, "30. Apr." bei Wolman sind unterschiedlich positioniert
├─ Root Cause: Stagger-Logik wechselt above/below, aber Titel-Höhe variiert (1 vs 2 Zeilen)
└─ Impact: Unregelmäßiges, chaotisches Erscheinungsbild

PROBLEM 5: PDF-Tabellen-Artefakte
├─ Beobachtung: PDF zeigt kaputte Tabellenstruktur mit wirrem Text
├─ Root Cause: jsPDF-Rendering + html2canvas erfasst Grid nicht korrekt
└─ Impact: PDF ist KOMPLETT unbrauchbar

PROBLEM 6: Fehlende MONATS-HEADER im Export
├─ Beobachtung: "Jan. Feb. März Apr. Mai Juni" Header fehlen oder sind kaum lesbar
├─ Root Cause: Grid-Struktur wird nicht korrekt erfasst
└─ Impact: Keine Zeitachsen-Orientierung im Export

PROBLEM 7: Kunde-Names werden abgeschnitten
├─ Beispiele: "Wein Wolf", "Sensoplast" sind teilweise abgeschnitten
├─ Root Cause: 140px Spaltenbreite + overflow: hidden auf Container
└─ Impact: Kundendaten nicht identifizierbar
```

## Root Cause Hierarchie

```
TECHNISCHE ROOT CAUSES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. HTML2CANVAS LIMITATIONS
   ├─ CSS Grid wird nicht vollständig unterstützt
   ├─ rgba/opacity-Werte werden inkonsistent erfasst
   ├─ transform/translate können Sub-Pixel-Artefakte erzeugen
   └─ Sticky-Elemente werden manchmal dupliziert oder ignoriert

2. LABEL-SYSTEM ZU RESTRIKTIV
   ├─ 100px maxWidth ist für deutsche Texte zu eng
   ├─ line-clamp-2 schneidet oft nach 1.5 Zeilen ab
   └─ Stagger-Threshold berücksichtigt nicht Label-BREITE, nur Position

3. VERBINDUNGSLINIEN-FARBE
   └─ `bg-muted-foreground/40` = CSS Variable mit Opacity
       → html2canvas kann CSS Variables nicht immer auflösen

4. EXPORT-CONTAINER SETUP
   ├─ Wrapper hat `p-4 -m-4` was negative Margins = komplexes Clipping
   └─ overflow-visible wird nicht respektiert beim Capture
```

## Architektur-Entscheidung: Canvas-First Rendering

Da html2canvas zu viele Limitationen hat, implementiere ich eine **hybride Lösung**:

1. **Für PNG**: Direktes Canvas-Rendering mit expliziten Farben (keine CSS-Variables)
2. **Für PDF**: Sauberes jsPDF-Rendering ohne html2canvas-Abhängigkeit

## Implementierungs-Plan

### Phase 1: Verbindungslinien-Fix (Sofort-Wirkung)

**Datei: `ClientPeriodBar.tsx`**

```tsx
// VORHER: CSS Variable mit Opacity - wird nicht erfasst
<div className="w-px h-3 bg-muted-foreground/40" />

// NACHHER: Explizite Farbe für Export-Kompatibilität
<div className="w-px h-3" style={{ backgroundColor: 'rgba(100, 100, 100, 0.4)' }} />
```

### Phase 2: Label-Text nicht abschneiden

**Datei: `ClientPeriodBar.tsx`**

Änderungen:
1. `maxWidth` von 100px auf **140px** erhöhen
2. `line-clamp-2` behalten, aber mit `word-break: break-word`
3. Datum und Titel zusammen in fester Höhe, damit Stagger konsistent ist

```tsx
// Label-Text Container
<div 
  className={cn(
    alignment === 'center' && "text-center",
    alignment === 'left' && "text-left",
    alignment === 'right' && "text-right"
  )} 
  style={{ maxWidth: '140px', minWidth: '80px' }}
>
  <div className="text-[11px] font-bold text-foreground leading-tight whitespace-nowrap">
    {formatDateCompact(new Date(milestone.date))}
  </div>
  <div 
    className="text-[10px] text-muted-foreground leading-snug" 
    style={{ 
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical',
      overflow: 'hidden',
      wordBreak: 'break-word',
      minHeight: '24px' // Feste Höhe für 2 Zeilen
    }}
  >
    {milestone.title}
  </div>
</div>
```

### Phase 3: Stagger-Threshold dynamisch

Der aktuelle Threshold von 12% reicht nicht, weil er die Label-Breite nicht berücksichtigt.

**Datei: `ClientPeriodBar.tsx`**

```tsx
// Neue intelligentere Stagger-Logik
const MIN_LABEL_DISTANCE_PERCENT = 15; // Erhöht von 12% auf 15%

// Zusätzlich: Wenn zwei Labels nahe beieinander UND beide lang sind
function needsStagger(currentLeft: number, lastLeft: number, currentTitle: string): boolean {
  const distance = currentLeft - lastLeft;
  const titleIsLong = currentTitle.length > 20;
  
  // Enger Abstand ODER beides lange Titel bei mittlerem Abstand
  if (distance < 15) return true;
  if (distance < 20 && titleIsLong) return true;
  
  return false;
}
```

### Phase 4: Export-Engine komplett neu

**Datei: `exportCanvas.ts`**

Neue Strategie: Vor dem Capture alle CSS-Variables durch explizite Werte ersetzen.

```tsx
export async function exportPlanningCanvas({
  elementId,
  format,
  filename,
  periodLabel,
}: ExportOptions): Promise<void> {
  const wrapperElement = document.getElementById(`${elementId}-export-wrapper`);
  const element = wrapperElement || document.getElementById(elementId);
  
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found`);
  }

  // Speichere Original-Styles
  const originalStyles = new Map<HTMLElement, string>();
  
  // Ersetze alle CSS-Variable Farben durch explizite Werte
  const allElements = element.querySelectorAll('*');
  allElements.forEach((el) => {
    if (el instanceof HTMLElement) {
      originalStyles.set(el, el.style.cssText);
      
      // Fix für muted-foreground opacity
      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.backgroundColor.includes('var(')) {
        el.style.backgroundColor = computedStyle.backgroundColor;
      }
    }
  });

  // Temporär Overflow visible
  const originalOverflow = element.style.overflow;
  element.style.overflow = 'visible';
  
  // Clone für sauberes Rendering
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.backgroundColor = '#ffffff';
  document.body.appendChild(clone);

  const canvas = await html2canvas(clone, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    scrollX: 0,
    scrollY: 0,
    windowWidth: clone.scrollWidth + 100,
    windowHeight: clone.scrollHeight + 100,
    onclone: (clonedDoc, clonedElement) => {
      // Alle Opacity-basierte Farben in explizite RGBA umwandeln
      clonedElement.querySelectorAll('[class*="bg-muted"]').forEach((el) => {
        if (el instanceof HTMLElement) {
          el.style.backgroundColor = 'rgba(100, 100, 100, 0.4)';
        }
      });
    }
  });

  // Cleanup
  document.body.removeChild(clone);
  element.style.overflow = originalOverflow;
  
  // Restore original styles
  originalStyles.forEach((cssText, el) => {
    el.style.cssText = cssText;
  });

  if (format === 'png') {
    downloadPNG(canvas, filename);
  } else {
    downloadPDF(canvas, filename, periodLabel);
  }
}
```

### Phase 5: PDF-Rendering verbessern

**Datei: `exportCanvas.ts`**

Das PDF sollte das Chart größer darstellen:

```tsx
function downloadPDF(canvas: HTMLCanvasElement, filename: string, periodLabel: string): void {
  const imgData = canvas.toDataURL('image/png', 1.0);
  
  // IMMER Landscape für Gantt-Charts
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 8; // Reduziert von 10mm
  const headerHeight = 15; // Reduziert von 20mm
  const footerHeight = 8; // Reduziert von 10mm
  
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = pageHeight - headerHeight - footerHeight - margin;

  // Minimalistischer Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Projektplanung', margin, margin + 6);
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(periodLabel, margin + 55, margin + 6);
  
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const dateStr = format(new Date(), 'd.MM.yyyy', { locale: de });
  doc.text(dateStr, pageWidth - margin, margin + 6, { align: 'right' });

  // Dezente Linie
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  doc.line(margin, headerHeight - 2, pageWidth - margin, headerHeight - 2);

  // Bild maximal groß
  const imgWidth = canvas.width / 2;
  const imgHeight = canvas.height / 2;
  const imgAspect = imgWidth / imgHeight;
  
  let finalWidth = contentWidth;
  let finalHeight = finalWidth / imgAspect;
  
  if (finalHeight > contentHeight) {
    finalHeight = contentHeight;
    finalWidth = finalHeight * imgAspect;
  }

  const x = margin + (contentWidth - finalWidth) / 2;
  const y = headerHeight;

  doc.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);

  // Dezenter Footer
  doc.setFontSize(6);
  doc.setTextColor(180, 180, 180);
  doc.text('habitbattle.lovable.app', pageWidth / 2, pageHeight - 4, { align: 'center' });

  doc.save(`${filename}.pdf`);
}
```

### Phase 6: Calendar-Container für sauberen Export

**Dateien: `HalfYearCalendar.tsx` & `QuarterCalendar.tsx`**

Der Export-Wrapper muss explizit weiß sein:

```tsx
// Wrapper mit explizitem weißen Hintergrund
<div 
  id="planning-chart-export-wrapper" 
  className="p-6 -m-6"
  style={{ backgroundColor: '#ffffff' }}
>
  <div 
    id="planning-chart" 
    className="border rounded-xl bg-card relative"
    style={{ overflow: 'visible', backgroundColor: '#ffffff' }}
  >
    ...
  </div>
</div>
```

## Zusammenfassung der Änderungen

| Datei | Änderung | Effekt |
|-------|----------|--------|
| `ClientPeriodBar.tsx` | Verbindungslinie mit expliziter Farbe | Linien erscheinen im Export |
| `ClientPeriodBar.tsx` | Label maxWidth 140px + minHeight | Vollständiger Text, konsistente Höhe |
| `ClientPeriodBar.tsx` | Stagger-Threshold 15% | Weniger Überlappungen |
| `exportCanvas.ts` | Clone-Strategie mit CSS-Fix | Sauberes Capturing |
| `exportCanvas.ts` | PDF immer Landscape, minimaler Header | Größeres Chart |
| `HalfYearCalendar.tsx` | Expliziter weißer Background | Kein transparenter Hintergrund |
| `QuarterCalendar.tsx` | Expliziter weißer Background | Konsistenz |

## Erwartetes Ergebnis nach Implementierung

1. **Labels**: Vollständig lesbarer Text ohne Abschneiden
2. **Verbindungslinien**: Klar sichtbar zwischen Label und Icon
3. **Keine Überlappung**: Stagger greift früher, Labels weichen aus
4. **PDF**: Professionelles A4-Landscape mit maximaler Chart-Größe
5. **PNG**: Retina-Qualität mit allen Details sichtbar

