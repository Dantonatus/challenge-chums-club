

## Fix: X-Achse im Gewichtsverlauf proportional zur Zeit

### Problem

Die X-Achse im `WeightTerrainChart` ist eine **kategorische Achse** (`dataKey="label"`). Das bedeutet: Jeder Datenpunkt bekommt den gleichen Abstand, egal ob zwischen zwei Punkten 1 Tag oder 45 Tage liegen. Deshalb sieht der Sprung von 01.12 auf 16.01 genauso breit aus wie von 17.09 auf 24.09.

### Loesung

Die X-Achse wird auf eine **numerische Zeitachse** umgestellt (`type="number"`), sodass die Abstände die tatsaechliche Zeitdauer widerspiegeln.

### Aenderungen in `src/components/weight/WeightTerrainChart.tsx`

**1. Timestamp-Feld zu jedem Datenpunkt hinzufuegen**

Jeder Punkt in `chartData` erhaelt ein neues Feld `ts` (Unix-Timestamp in Millisekunden), berechnet aus `parseISO(date).getTime()`. Dieses Feld wird als `dataKey` fuer die X-Achse verwendet.

**2. XAxis auf numerischen Typ umstellen**

```text
Vorher:  <XAxis dataKey="label" interval={xInterval} />
Nachher: <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin','dataMax']} 
                tickFormatter={(ts) => format(new Date(ts), 'dd. MMM', {locale: de})} />
```

- `type="number"` + `scale="time"`: Recharts berechnet die Abstände proportional
- `tickFormatter`: Wandelt den Timestamp zurueck in lesbares Datum
- `domain={['dataMin','dataMax']}`: Nutzt den vollen Datenbereich
- `interval` wird durch automatische Tick-Berechnung ersetzt (oder `tickCount` fuer bessere Kontrolle)

**3. ReferenceArea und ReferenceLine anpassen**

Die `x1`/`x2` Werte fuer den Forecast-Hintergrund und die "HEUTE"-Linie nutzen aktuell `label`-Strings. Diese muessen auf die entsprechenden `ts`-Werte umgestellt werden:
- `lastRealLabel` → `lastRealTs` (Timestamp des letzten echten Datenpunkts)
- `forecastStartLabel` → `forecastStartTs`
- Letzter Chart-Punkt: `chartData[chartData.length - 1].ts`

**4. xInterval-Berechnung entfernen**

Die `useMemo` fuer `xInterval` (Zeilen 184-190) wird nicht mehr benoetigt, da Recharts bei einer Zeitachse die Ticks automatisch verteilt. Optional kann `tickCount` gesetzt werden (z.B. 8-12 Ticks).

### Ergebnis

- 7 Tage Abstand = schmaler Bereich auf der X-Achse
- 45 Tage Abstand = entsprechend breiter Bereich
- Die Zeitachse ist visuell korrekt und proportional

