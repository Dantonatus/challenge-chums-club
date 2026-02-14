

# PDF-Export: Neues Layout-Konzept

## Analyse der Probleme

Vergleich Dashboard vs. PDF zeigt 3 konkrete Probleme:

1. **Alles auf eine Seite gequetscht**: 5 von 6 Sektionen werden auf Seite 1 gepresst (KPIs + Heatmap + Records + 2 Grid-Rows). Nur 4mm Abstand zwischen den Bildern.
2. **Seite 2 fast leer**: Nur die letzte Grid-Row (Wochentag + Monat) mit riesigem Leerraum darunter.
3. **KPI-Karten abgeschnitten**: Der "Diesen Monat"-Subtext wird am unteren Rand abgeschnitten, weil der Capture-Bereich zu eng ist.

## Ursache

Der Seitenumbruch-Check `y + imgH + 4 > PAGE_H - 12` bricht erst um, wenn ein Bild physisch nicht mehr passt. Dadurch wird alles maximal zusammengepresst, bis kein Pixel mehr Platz hat.

## Neues Konzept: "Drucklayout mit Atemraum"

### Prinzip

Statt "so viel wie moeglich auf eine Seite quetschen" wird das Layout so verteilt, dass es dem Bildschirm-Erlebnis entspricht -- mit angemessenen Abstaenden und sinnvollen Seitenumbruechen.

### Konkrete Aenderungen

#### 1. Abstaende erhoehen (4mm -> 10mm)

Zwischen jeder Sektion 10mm Abstand statt 4mm. Das entspricht ungefaehr dem `space-y-6` (24px ~ 6mm bei 96dpi) aus dem Dashboard, aufgerundet fuer Print.

#### 2. Intelligenter Seitenumbruch

Neue Regel: Wenn nach dem Platzieren eines Bildes weniger als 60mm auf der Seite uebrig bleiben, wird die naechste Sektion auf eine neue Seite gesetzt. Das verhindert, dass eine Sektion am unteren Rand gequetscht wird.

```text
Seite 1:
  [Header-Balken 22mm]
  [6mm Abstand]
  [KPI-Cards ~18mm]
  [10mm Abstand]
  [Heatmap ~55mm]
  [10mm Abstand]
  [Personal Records ~30mm]
  [10mm Abstand]
  [Grid Row 1: Frequenz + Ruhetage ~65mm]
  -- Seitenumbruch (< 60mm uebrig) --

Seite 2:
  [Grid Row 2: Besuche + Uhrzeiten ~65mm]
  [10mm Abstand]
  [Grid Row 3: Wochentag + Monat ~65mm]
```

#### 3. Padding um Captures

Beim html-to-image Capture einen kleinen Padding-Puffer einbauen, damit nichts am Rand abgeschnitten wird. Dafuer wird `style` im Capture-Options uebergeben: `{ padding: '4px' }`.

#### 4. Hintergrund-Farbe im Capture setzen

Das aktuelle Problem: Die Screenshots haben einen transparenten Hintergrund, der im JPEG als schwarzer Hintergrund erscheint. Loesung: `backgroundColor` explizit im `toJpeg`-Aufruf setzen, basierend auf dem aktuellen Theme.

### Technische Aenderungen

#### `src/pages/app/training/TrainingPage.tsx`

- `toJpeg`-Optionen erweitern um `backgroundColor` (Theme-abhaengig: `#141414` fuer Dark, `#fcfcfc` fuer Light)
- Kein Aendern der Refs oder Sektionen -- die 6 Refs bleiben

#### `src/lib/training/exportTrainingPDF.ts`

- Abstand zwischen Sektionen von 4mm auf 10mm erhoehen
- Seitenumbruch-Logik aendern: Wenn nach dem Bild weniger als 60mm frei waeren, vorher umbrechen
- Footer-Platz von 12mm auf 16mm erhoehen (etwas mehr Abstand zum Seitenende)

| Datei | Aenderung |
|---|---|
| `src/pages/app/training/TrainingPage.tsx` | `backgroundColor` in toJpeg-Optionen hinzufuegen |
| `src/lib/training/exportTrainingPDF.ts` | Abstand 4->10mm, Seitenumbruch-Schwelle 60mm, Footer-Platz 16mm |

