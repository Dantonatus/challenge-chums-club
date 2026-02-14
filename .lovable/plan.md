

# Fix: Abgeschnittene Card-Raender im PDF-Export

## Problem-Analyse

Die `style: { padding: '8px' }` Option in `toJpeg` funktioniert nicht wie erwartet. Sie aendert das Padding des geklonten Elements, aber die Capture-Groesse wird vom Original-Element berechnet. Dadurch werden Borders, Rundungen und Schatten am rechten und unteren Rand jeder Sektion abgeschnitten.

Sichtbar bei:
- KPI-Cards: Rechter Rand von "Lieblings-Zeit" fehlt
- Heatmap: Unterer Rand bei "So" abgeschnitten
- Personal Records: Rechter Rand von "Laengste Pause" fehlt
- Grid-Rows: Rechte und untere Raender der Charts beschnitten

## Loesung

Statt `style: { padding }` im toJpeg-Aufruf (unzuverlaessig) wird Padding direkt auf die Wrapper-Divs im DOM gelegt. Um das Dashboard-Layout nicht zu veraendern, wird gleichzeitig ein negativer Margin gesetzt, der das Padding visuell ausgleicht.

```text
Vorher:  <div ref={kpiRef}>              --> Capture-Bereich = exakte Elementgroesse
Nachher: <div ref={kpiRef} class="-m-3 p-3"> --> Capture-Bereich = Element + 12px Rand rundum
```

Der Trick: `-m-3` (negative margin) zieht das Element zurueck, sodass es im Dashboard exakt gleich aussieht. Aber `p-3` (padding) erweitert die tatsaechliche Box, die html-to-image erfasst. Das ergibt 12px Puffer auf allen Seiten -- genug fuer Borders, Rundungen und Schatten.

## Aenderungen

### `src/pages/app/training/TrainingPage.tsx`

1. **Wrapper-Divs**: Allen Ref-Divs die Klasse `-m-3 p-3` hinzufuegen
2. **toJpeg-Optionen**: `style: { padding: '8px' }` entfernen (nicht mehr noetig, da das Padding jetzt direkt im DOM ist)

Betroffene Zeilen:
- `<div ref={kpiRef}>` wird zu `<div ref={kpiRef} className="-m-3 p-3">`
- `<div ref={heatmapRef}>` wird zu `<div ref={heatmapRef} className="-m-3 p-3">`
- `<div ref={recordsRef}>` wird zu `<div ref={recordsRef} className="-m-3 p-3">`
- `<div ref={gridRow1Ref} className="grid ...">` wird zu `<div ref={gridRow1Ref} className="-m-3 p-3 grid ...">`
- `<div ref={gridRow2Ref} className="grid ...">` wird zu `<div ref={gridRow2Ref} className="-m-3 p-3 grid ...">`
- `<div ref={gridRow3Ref} className="grid ...">` wird zu `<div ref={gridRow3Ref} className="-m-3 p-3 grid ...">`
- `<div ref={calendarRef}>` wird zu `<div ref={calendarRef} className="-m-3 p-3">`
- `style: { padding: '8px' }` wird aus den toJpeg-Optionen entfernt

Keine Aenderungen an `exportTrainingPDF.ts` noetig.

