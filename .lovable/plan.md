

## Fix: Symmetrische Ausrichtung der Segment-Karten um die Koerperfigur

### Problem
Die linken Karten (Linker Arm, Linkes Bein) sitzen am linken Rand ihrer Grid-Zelle, waehrend die rechten Karten naeher an der Figur sind. Das erzeugt ein asymmetrisches Layout, weil die Karten nicht gleichmaessig zur Mitte hin ausgerichtet sind.

### Ursache
Das Desktop-Grid nutzt `1fr auto 1fr` -- die linken Zellen haben `flex items-center` ohne horizontale Ausrichtung, die Karten landen also links in der Zelle statt rechts (nahe der Figur).

### Loesung

**Datei: `src/components/bodyscan/AnatomyFigure.tsx`**

Aenderungen am Desktop-Grid-Layout (ab Zeile 358):

1. **Linke Karten (`armL`, `legL`)**: `justify-end` hinzufuegen, damit die Karten rechtsbuendig zur Figur hin sitzen
2. **Rechte Karten (`armR`, `legR`)**: `justify-start` hinzufuegen, damit sie linksbuendig zur Figur hin sitzen
3. **Alle Karten gleiche Breite**: `w-full max-w-[180px]` auf die inneren Card-Container, damit links und rechts gleich breit sind
4. **Trunk zentriert**: Bleibt wie bisher mit `justify-center`

Konkrete Aenderungen:
- `armL`-Zelle: `flex items-center` wird zu `flex items-center justify-end`
- `armR`-Zelle: `flex items-center` wird zu `flex items-center justify-start`
- `legL`-Zelle: `flex items-start` wird zu `flex items-start justify-end`
- `legR`-Zelle: `flex items-start` wird zu `flex items-start justify-start`

Das ergibt ein symmetrisches Layout: Karten links werden zur Figur hin geschoben, Karten rechts ebenso -- gleichmaessiger Abstand auf beiden Seiten.

