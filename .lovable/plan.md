

## Body Scan PDF Export: High-Quality Redesign

### Aktuelle Probleme
1. **Reine Screenshots** — Diagramme werden als JPEG-Bilder eingefuegt, Text ist nicht selektierbar, bei Zoom pixelig
2. **Keine Sektions-Titel** — Screenshots werden ohne Beschriftung aneinandergereiht, Kontext fehlt
3. **Keine Zahlen-Zusammenfassung** — Man muss die Werte aus kleinen Chart-Screenshots ablesen
4. **JPEG-Artefakte** — Linien und Text in Charts werden durch JPEG-Kompression unscharf

### Verbesserungen

#### 1. Vektor-gerenderte KPI-Zusammenfassung (erste Seite)
Statt nur den KPI-Cards-Screenshot: Eine saubere, vektor-basierte Tabelle direkt nach dem Header mit allen aktuellen Werten + Trend. Aehnlich dem TANITA-Originalbericht — kompakt, klar lesbar, druckbar.

```text
┌─────────────────────────────────────────────────┐
│  Body Scan Bericht          12. Mai 2015 – ...  │  ← Header (wie bisher)
├─────────────────────────────────────────────────┤
│                                                 │
│  Aktueller Scan: 10.04.2026                     │
│                                                 │
│  ┌──────────────┬──────────┬────────────────┐   │
│  │ Kennzahl     │ Wert     │ Veraenderung   │   │
│  ├──────────────┼──────────┼────────────────┤   │
│  │ Gewicht      │ 95.9 kg  │ +3.7 vs Start  │   │
│  │ Koerperfett  │ 18.9 %   │ -1.9 vs vorher │   │
│  │ Fettmasse    │ 18.1 kg  │ -1.4 vs vorher │   │
│  │ ...          │ ...      │ ...            │   │
│  └──────────────┴──────────┴────────────────┘   │
│                                                 │
│  Segment-Uebersicht                             │
│  ┌──────────┬──────────┬──────────┐             │
│  │ Segment  │ Muskel   │ Fett %   │             │
│  ├──────────┼──────────┼──────────┤             │
│  │ Rumpf    │ 40.3 kg  │ 20.8 %   │             │
│  │ ...      │ ...      │ ...      │             │
│  └──────────┴──────────┴──────────┘             │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### 2. PNG statt JPEG fuer Chart-Screenshots
PNG ist verlustfrei — Linien, Text und Gitterlinien in den Charts bleiben scharf. Dateigroesse steigt leicht, aber Qualitaet deutlich besser.

#### 3. Hoehere Aufloesung (3x statt 2x)
`pixelRatio: 3` fuer Retina-scharfe Darstellung auch beim Zoomen.

#### 4. Sektions-Titel ueber jedem Chart-Screenshot
Vektor-Text (z.B. "Koerperkomposition – Verlauf") als Ueberschrift ueber jedem eingebetteten Bild. Gibt Orientierung und wirkt professioneller.

#### 5. Subtile Rahmen um Chart-Bilder
Dünner, abgerundeter Rahmen (1pt, hellgrau) um jedes eingebettete Bild — visuell sauberer als "Screenshots auf weissem Hintergrund".

### Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/bodyscan/exportBodyScanPDF.ts` | Komplett ueberarbeitet: Vektor-KPI-Tabelle, Sektions-Titel, PNG-Format, 3x Aufloesung, Rahmen |
| `src/pages/app/training/BodyScanPage.tsx` | `toJpeg` → `toPng`, `pixelRatio: 3`, Sektions-Labels an Export-Funktion weitergeben |

### Keine Aenderungen an
- Bestehende Charts/UI-Komponenten
- Andere PDF-Exporte (Training, Weight)

