
# Anatomische Koerperfigur -- Segment-Visualisierung

## Uebersicht

Eine interaktive SVG-Koerperfigur wird unten auf der Body Scan Seite eingefuegt. Sie zeigt die segmentale Muskel- und Fettverteilung direkt auf einer stilisierten menschlichen Silhouette -- visuell ansprechend mit Farbverlaeufen und animierten Einblendungen.

## Design-Konzept

Eine minimalistische, symmetrische Koerper-Silhouette als SVG mit 5 Zonen:

- **Rumpf** (Trunk) -- Torso-Bereich
- **Arm Links** -- linker Arm
- **Arm Rechts** -- rechter Arm
- **Bein Links** -- linkes Bein
- **Bein Rechts** -- rechtes Bein

Jede Zone wird farblich eingefaerbt basierend auf den Werten:
- **Muskel-Modus**: Farbintensitaet (hsl-blau/primary) skaliert mit kg-Wert relativ zum hoechsten Segment
- **Fett-Modus**: Farbintensitaet (hsl-rot) skaliert mit %-Wert relativ zum hoechsten Segment

Toggle zwischen Muskel- und Fett-Ansicht oben in der Card.

### Interaktion

- **Hover/Tap** auf ein Segment zeigt Tooltip mit exaktem Wert + Veraenderung zum Vorscan
- **Eintritts-Animation**: Segmente faden nacheinander ein (staggered, je 100ms versetzt) mit framer-motion
- **Pulsierendes Gluehen** auf dem Segment mit dem hoechsten Wert

### Labels

Neben jedem Segment werden die Werte als kleine Labels angezeigt (z.B. "12.3 kg" oder "18.2%"), verbunden mit einer feinen Linie zum Segment. Falls keine Segment-Daten vorhanden sind, wird die gesamte Komponente nicht gerendert.

## Technische Umsetzung

### Neue Datei: `src/components/bodyscan/AnatomyFigure.tsx`

Die Komponente besteht aus:

1. **SVG Koerper-Silhouette** -- handgezeichnete Pfade fuer die 5 Zonen (symmetrisch, ca. 300x500 Viewbox)
2. **Farb-Mapping**: Jedes Segment bekommt eine Fuellfarbe deren Opazitaet/Saettigung proportional zum relativen Wert ist
3. **Label-Lines**: Feine SVG-Linien von jedem Segment zu einem Text-Label am Rand
4. **Toggle**: Kleiner Button-Toggle oben ("Muskel" | "Fett") der zwischen den zwei Datensaetzen wechselt
5. **Hover-State**: framer-motion `whileHover` fuer leichtes Scale + Tooltip
6. **Eingangs-Animation**: `motion.path` mit `initial={{ opacity: 0 }} animate={{ opacity: 1 }}` und gestaffeltem `transition.delay`

### Datenfluss

```text
Props: { scans: BodyScan[] }

1. latestScan(scans) -> segments_json
2. previousScan(scans) -> segments_json (fuer Diff)
3. Falls segments_json === null -> return null
4. mode state: "muscle" | "fat"
5. Werte je nach mode aus segments_json.muscle oder segments_json.fat
6. Relative Intensitaet = wert / max(alle 5 segmente)
7. Diff = aktuell - vorher (anzeigen als +/- im Tooltip)
```

### SVG-Aufbau (Vereinfacht)

```text
viewBox="0 0 300 500"

Kopf:      Kreis bei (150, 40) r=25     -- nur Silhouette, keine Daten
Rumpf:     Rechteck/Pfad (100-200, 80-250)
Arm L:     Pfad links (40-100, 100-260)
Arm R:     Pfad rechts (200-260, 100-260)
Bein L:    Pfad links (95-145, 260-480)
Bein R:    Pfad rechts (155-205, 260-480)

Labels:    Text-Elemente mit Connector-Lines
           Links:  Arm L (x=10), Bein L (x=10)
           Rechts: Arm R (x=290), Bein R (x=290)
           Mitte:  Rumpf (x=150, y=170)
```

### Farbschema

```text
Muskel-Modus:
  Basis: hsl(210 70% 55%)  -- Blau
  Opazitaet: 0.3 + 0.7 * (wert / maxWert)
  Hoechstes Segment: zusaetzlich pulsierender Glow-Filter

Fett-Modus:
  Basis: hsl(0 60% 55%)    -- Rot
  Opazitaet: 0.3 + 0.7 * (wert / maxWert)
  Hoechstes Segment: pulsierender Glow-Filter
```

### Integration in BodyScanPage.tsx

- Neue Ref `anatomyRef` fuer PDF-Export
- Neue Section in pdfSections: `{ label: 'Anatomie', ref: anatomyRef }`
- Platzierung: nach der Segment-Analyse (nach segmentsRef), vor Stoffwechsel
- Wird auch in den PDF-Export einbezogen

## Dateien

| Datei | Aenderung |
|-------|-----------|
| `src/components/bodyscan/AnatomyFigure.tsx` | **Neu** -- SVG Koerperfigur mit Segment-Overlay |
| `src/pages/app/training/BodyScanPage.tsx` | Import + Einbindung + PDF-Ref |

## Abhaengigkeiten

- `framer-motion` (bereits installiert) -- fuer Einblend-Animationen und Hover-Effekte
- Kein neues Package noetig
