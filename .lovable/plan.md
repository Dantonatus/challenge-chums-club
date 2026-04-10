

## Body Scan: Rollierende Zeitraeume + 6-Monats-Ansicht

### Problem

"Quartal" zeigt aktuell Kalenderquartale (Q1 Jan-Mrz, Q2 Apr-Jun etc.). Gewuenscht: **rollierend ab heute** — "letzte 3 Monate" und zusaetzlich "letzte 6 Monate".

### Loesung

Zwei neue Modi in `PeriodNavigator` einfuehren: `last3m` und `last6m`. Diese sind **nicht navigierbar** (keine Pfeile, wie bei `all`), da sie immer relativ zu "jetzt" berechnet werden.

### Aenderung: `src/components/weight/PeriodNavigator.tsx`

1. `PeriodMode` erweitern um `'last3m' | 'last6m'`
2. `computeRange` erweitern:
   - `last3m`: `start = heute - 3 Monate`, `end = heute`
   - `last6m`: `start = heute - 6 Monate`, `end = heute`
3. `buildLabel` erweitern:
   - `last3m`: z.B. "Letzte 3 Monate (Jan–Apr 2026)"
   - `last6m`: z.B. "Letzte 6 Monate (Okt 2025–Apr 2026)"
4. Pfeile ausblenden wenn `mode === 'last3m' || mode === 'last6m'` (wie bei `all`)
5. `MODE_LABELS` erweitern: `last3m: '3M'`, `last6m: '6M'`

### Aenderung: `src/pages/app/training/BodyScanPage.tsx`

- `modes` aendern: `['month', 'last3m', 'last6m', 'year', 'all']` — `quarter` wird durch `last3m` ersetzt
- `defaultMode` auf `'last3m'` setzen

### Keine Auswirkung auf Weight

WeightPage nutzt weiterhin `quarter` (Kalenderquartal). Die neuen Modi sind additiv.

