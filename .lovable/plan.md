

## Fix: Lineare Regression auf echte Tagesabstaende umstellen

### Problem
Die lineare Regression nutzt laufende Indizes (`0, 1, 2, ...`) als x-Werte statt echte Tagesabstaende. Wenn Eintraege unregelmaessig verteilt sind (z.B. taegliche Eintraege, dann eine 2-Wochen-Pause), ergibt sich im Chart eine krumme Linie, obwohl es mathematisch eine Gerade sein sollte -- weil die x-Achse im Chart echte Kalendertage darstellt, die Regression aber gleichmaessige Abststaende annimmt.

### Loesung

**Datei: `src/lib/weight/analytics.ts`** -- Funktion `linearRegression`

Statt `xs = [0, 1, 2, ... n-1]` die tatsaechlichen Tage seit dem ersten Eintrag verwenden:

```typescript
// Vorher (Index-basiert):
const xs = sorted.map((_, i) => i);

// Nachher (Tage seit erstem Eintrag):
const t0 = new Date(sorted[0].date).getTime();
const MS_PER_DAY = 86_400_000;
const xs = sorted.map(e => (new Date(e.date).getTime() - t0) / MS_PER_DAY);
```

Die Steigung und der Intercept werden mit denselben OLS-Formeln berechnet, nur dass `x` jetzt echte Tage repraesentiert. Die Rueckgabewerte bleiben identisch (`{ date, value }[]`), sodass keine Aenderungen am Chart noetig sind.

### Aenderungen

Nur eine Datei, eine Funktion:

**`src/lib/weight/analytics.ts`**, Funktion `linearRegression` (Zeile ~89-103):
- Zeile `const xs = sorted.map((_, i) => i);` ersetzen durch die tagesbasierte Berechnung (3 Zeilen)
- Rest der Funktion bleibt identisch

### Ergebnis
Die Regressionslinie wird im Chart als perfekte Gerade dargestellt, unabhaengig davon wie unregelmaessig die Eintraege verteilt sind.
