

## Körperkomposition: Gestapelte Sub-Charts für Granularität + logische Ordnung

### Problem
Eine gemeinsame Achse von ~15 bis ~98 kg macht die Kurven zu flach — Veränderungen von 0.5-2 kg sind kaum erkennbar.

### Lösung: Zwei vertikal gestapelte Charts mit geteilter X-Achse

```text
┌──────────────────────────────────┐
│  Gewicht + Muskelmasse           │  ← Tight domain z.B. 70-97 kg
│  ~~~~~~~~~~~  Gewicht            │
│  ~~~~~~~~~~   Muskelmasse        │
│                                  │
├──────────────────────────────────┤
│  Fettmasse                       │  ← Tight domain z.B. 16-21 kg
│  ~~~~~~~~~~   Fettmasse          │
│                                  │
└──────────────────────────────────┘
         Datum-Achse (geteilt)
```

- **Oben**: Gewicht + Muskelmasse auf einer tight domain (~70-97 kg) — kleine Änderungen gut sichtbar, direkt vergleichbar
- **Unten**: Fettmasse auf eigener tight domain (~16-21 kg) — jedes Gramm zählt
- Fettmasse ist visuell **unterhalb** der anderen Werte → logisch korrekt
- Keine Misskonzeption möglich, da keine Linien verschiedener Achsen sich kreuzen
- X-Achse nur beim unteren Chart anzeigen (oben ausblenden)
- Beide Charts im selben `<Card>` unter einer gemeinsamen Überschrift

### Datei
`src/components/bodyscan/CompositionTrendChart.tsx`:
- Zwei `<ResponsiveContainer>` + `<LineChart>` übereinander (oberer ~200px, unterer ~140px)
- Oberer Chart: Gewicht + Muskelmasse, tight domain, X-Achse `hide`
- Unterer Chart: Fettmasse, eigene tight domain, X-Achse sichtbar
- Gemeinsamer Tooltip-Stil, `tickCount={6}` auf beiden Y-Achsen
- Synchronisierte Margins für vertikale Ausrichtung

