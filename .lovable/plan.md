

# Gewichtsverlauf-Chart verbessern

## Probleme

1. **Chart zu klein** -- Hoehe nur 320px, wirkt gequetscht
2. **Zu viele Datumslabels** -- `interval="preserveStartEnd"` zeigt zu viele Ticks bei 54 Datenpunkten
3. **Keine Legende** -- Die gestrichelte graue Linie (7-Tage-Durchschnitt) ist nicht erklaert
4. **Keine statistischen Trendlinien** -- Nur der gleitende Durchschnitt existiert

## Aenderungen

### 1. Chart groesser machen

`WeightTerrainChart.tsx`: Hoehe von 320px auf **420px** erhoehen.

### 2. Weniger Datumslabels

XAxis `interval` dynamisch berechnen statt `"preserveStartEnd"`:
- Unter 15 Datenpunkte: jeden zeigen
- 15-30: jeden 3. zeigen
- 30+: jeden 5. zeigen

### 3. Legende hinzufuegen

Unterhalb des Charts eine kompakte, handgebaute Legende mit 3 Eintraegen:
- Durchgezogene Linie + Farbflaeche = "Gewicht"
- Gestrichelte graue Linie = "Ø 7 Tage"
- Neue Trendlinie (siehe Punkt 4)

### 4. Statistische Trendlinien

Folgende Trendlinien werden als zuschaltbare Optionen angeboten (Toggle-Chips oberhalb des Charts):

| Trendlinie | Beschreibung | Farbe |
|---|---|---|
| **Ø 7 Tage** | Bereits vorhanden, gleitender 7-Tage-Durchschnitt | Grau gestrichelt (bleibt) |
| **Ø 30 Tage** | Gleitender 30-Tage-Durchschnitt fuer langfristigen Trend | Blau gestrichelt |
| **Lineare Regression** | Gerade Linie (Least-Squares-Fit) ueber gesamten Zeitraum -- zeigt Gesamtrichtung | Orange durchgezogen, duenn |

**Umsetzung:**

- `analytics.ts`: Neue Funktion `linearRegression(entries)` die Steigung + Achsenabschnitt berechnet und fuer jeden Datenpunkt den Regressionswert liefert
- `analytics.ts`: `movingAverage` wird bereits mit variablem Window aufgerufen -- fuer MA30 einfach `movingAverage(entries, 30)`
- `WeightTerrainChart.tsx`: 
  - State fuer aktive Trendlinien: `activeTrends: Set<'ma7' | 'ma30' | 'regression'>`
  - Toggle-Chips (kleine klickbare Badges) oberhalb des Charts
  - Zusaetzliche `<Line>`-Komponenten fuer MA30 und Regression, nur gerendert wenn aktiv
  - MA7 standardmaessig aktiv, die anderen aus

### Betroffene Dateien

| Datei | Aenderung |
|---|---|
| `src/lib/weight/analytics.ts` | Neue `linearRegression()` Funktion |
| `src/components/weight/WeightTerrainChart.tsx` | Groesserer Chart, dynamisches Interval, Legende, Toggle-Chips, 2 neue Trendlinien |

