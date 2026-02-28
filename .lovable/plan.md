

## Fix: Abgeschnittene Kanten am unteren Rand der PDF-Sektionen

### Problem
Der aktuelle Capture-Buffer (`-m-3 p-3` = 12px) ist zu klein fuer Elemente mit `border-radius`, `box-shadow` und Borders. Besonders am unteren Rand werden Schatten und abgerundete Ecken abgeschnitten, weil `html-to-image` nur den exakten Bounding-Rect des Elements erfasst -- ueberhaengende Schatten und Subpixel-Rundungen fallen weg.

### Ursache
- CSS `box-shadow` liegt ausserhalb der Element-Box und wird bei zu kleinem Buffer abgeschnitten
- `border-radius` an Cards erzeugt Subpixel-Kanten, die bei knappem Padding verloren gehen
- 12px Buffer reicht nicht fuer typische Schatten wie `shadow-sm` oder `shadow-md`

### Loesung

**Datei: `src/pages/app/training/TrainingPage.tsx`**

Den Capture-Buffer von `-m-3 p-3` (12px) auf `-m-5 p-5` (20px) erhoehen. Das gibt genuegend Platz fuer Schatten, Rundungen und Borders auf allen Seiten.

Betrifft alle 7 Sektions-Wrapper (Zeilen 135-150):
- `kpiRef`, `heatmapRef`, `recordsRef` -- einzelne Sektionen
- `gridRow1Ref`, `gridRow2Ref`, `gridRow3Ref` -- 2-Spalten-Grids
- `calendarRef` -- Kalender

**Datei: `src/pages/app/training/BodyScanPage.tsx`**

Gleiche Aenderung: alle `-m-3 p-3` Wrapper auf `-m-5 p-5` erhoehen, damit Body Scan PDFs konsistent sind.

### Ergebnis
- Schatten und abgerundete Ecken werden vollstaendig erfasst
- Kein sichtbarer Einfluss auf das Dashboard-Layout (negative Margin hebt das Padding auf)
- Konsistenter 20px Buffer auf allen Seiten jeder Sektion

