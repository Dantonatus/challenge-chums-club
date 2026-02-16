

# Prognose-Popovers: 3 separate mathematische Beschreibungen

## Problem

Aktuell erklaert das Popover der Prognose-Buttons alles in einem Fliesstext. Der User moechte 3 klar getrennte Abschnitte fuer die 3 visuellen Elemente.

## Aenderung: `src/components/weight/WeightTerrainChart.tsx`

### Datenstruktur erweitern

Die `description`-Objekte der 3 Forecast-Eintraege (`forecast14`, `forecast30`, `forecast60`) bekommen statt eines einzelnen `calc`-Strings ein neues Feld `elements` mit 3 Eintraegen:

| Element | Visuell | Formel |
|---|---|---|
| **Gestrichelte Linie** | Dashed line (6 3) | Damped Holt-Winters: L = alpha * y + (1-alpha) * (L + phi * T), T = beta * (L - L_prev) + (1-beta) * phi * T. Vorhersage: P(k) = L + (Summe phi^1..k) * T. Parameter: alpha=0.4, beta=0.2, phi=0.95 |
| **Duenne kurvige Linie** | Thin solid line | Simulated(k) = P(k) + dailySwing * sin(1.3k + cos(0.7k)). dailySwing = RMS der taeglichen Differenzen = sqrt(Summe(y_t - y_{t-1})^2 / n) |
| **Konfidenzband** | Schattierte Flaeche | Band = P(k) +/- min(1.96 * dailySwing * sqrt(k), 2.0 kg). Waechst mit sqrt(k), gedeckelt bei +/-2.0 kg |

### UI-Anpassung im Popover

Statt eines einzelnen `calc`-Blocks werden 3 Abschnitte gerendert, jeweils mit:
- **Label** (fett, text-xs) -- z.B. "Gestrichelte Linie"
- **Formel** (font-mono, bg-muted/50, rounded)

Der bestehende `text`-Absatz bleibt als Einleitung erhalten. Darunter folgen die 3 Elemente als kompakte Liste.

### Technische Details

- Die `description`-Typisierung wird um ein optionales `elements`-Array erweitert: `{ name: string; formula: string }[]`
- Im Render-Code: Wenn `elements` vorhanden, wird fuer jedes Element ein kleiner Block gerendert
- Die Aenderung betrifft nur die 3 Forecast-Configs (`forecast14`, `forecast30`, `forecast60`), alle anderen Trend-Buttons bleiben unveraendert (behalten ihr `calc`-Feld)
- Keine neuen Abhaengigkeiten

