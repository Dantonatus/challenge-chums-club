

# PDF-Export: Kalender hinzufuegen + abgeschnittene Raender fixen

## Probleme

1. **Trainingskalender fehlt im Export**: Kein Ref, nicht in `pdfSections` enthalten.
2. **Card-Raender abgeschnitten**: Die Cards haben `rounded-lg border shadow-sm`. Der aktuelle `padding: '4px'` im Capture reicht nicht aus, um die Rundungen und den Schatten vollstaendig zu erfassen. Die aeusseren Pixel der Borders werden abgeschnitten.

## Loesung

### 1. Trainingskalender exportieren

- Neuen `calendarRef` hinzufuegen
- `pdfSections` um den Kalender erweitern (als letzte Sektion)
- Ref auf den `<TrainingCalendar>`-Wrapper setzen

### 2. Padding erhoehen: 4px auf 8px

Der `padding: '4px'`-Wert im `toJpeg`-Aufruf ist zu knapp fuer die `border + rounded-lg + shadow-sm` Kombination der Cards. Mit `8px` werden Borders, Rundungen und Schatten vollstaendig erfasst.

## Aenderungen

### `src/pages/app/training/TrainingPage.tsx`

- Neuer Ref: `const calendarRef = useRef<HTMLDivElement>(null);`
- `pdfSections` erweitern um `{ label: 'Trainingskalender', ref: calendarRef }`
- Kalender-JSX mit Ref wrappen: `<div ref={calendarRef}><TrainingCalendar ... /></div>`
- `style: { padding: '4px' }` aendern zu `style: { padding: '8px' }` im `toJpeg`-Aufruf

Keine Aenderungen an `exportTrainingPDF.ts` noetig -- die Paginierungslogik handhabt die zusaetzliche Sektion automatisch.
