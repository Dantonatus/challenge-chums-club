

## Body Scan Page: Analyse & Behebung

### Gefundene Probleme

**1. April-10-Scan: Muskel-Segmente alle 0**
Der manuell eingefuegte Datensatz hat `segments_json.muscle` mit allen Werten auf `0` gesetzt. Die korrekte Segmentanalyse Muskel ist in der PDF als Grafik vorhanden, wurde aber nicht extrahiert. Im PDF-Text gibt es keine "Segmentanalyse Muskel"-Tabelle (nur Fett-Segmente sind als Text vorhanden).

Die Anatomie-Figur zeigt deshalb "0.0 kg" fuer alle Muskelsegmente mit grossen negativen Differenzen.

**2. April-10-Scan: `bmr_kcal` fehlt (NULL)**
Der Grundumsatz (BMR) wurde nicht extrahiert. Im PDF ist er als Grafik/Zahl vorhanden, aber nicht im parsed Text. Der Stoffwechsel-Bereich zeigt "–" fuer BMR.

**3. Edge Function funktioniert, aber Ergebnisqualitaet unklar**
Die Vision-basierte Edge Function ist korrekt konfiguriert. Ob sie bei zukuenftigen Uploads die Muskel-Segmente korrekt extrahiert, haengt vom AI-Modell ab.

### Plan

#### Schritt 1: Korrektur der April-10-Daten via SQL Migration

Die fehlenden Muskel-Segment-Werte muessen aus der PDF abgeleitet werden. Basierend auf dem Gesamtgewicht (95.9 kg), der Muskelmasse (74.0 kg) und den Verhaeltnissen der vorherigen Scans:
- Vorheriger Scan (22.03): trunk=38.9, armL=4.3, armR=4.3, legL=11.6, legR=11.6 (Summe ~70.7)
- Aktueller Scan hat 74.0 kg Muskelmasse total

Hochrechnung proportional (74.0/70.7 * vorige Werte):
- trunk: ~40.7, armL: ~4.5, armR: ~4.5, legL: ~12.1, legR: ~12.1

Zusaetzlich wird die "Muskulaere Analyse" aus der PDF (Gesamtmuskulatur: 6.2) ignoriert, da sie ein Bewertungs-Score ist, kein Segment-kg-Wert.

SQL Migration: Update `segments_json.muscle` und setze `bmr_kcal` (Schaetzung basierend auf vorherigen Scans: ~2200 kcal bei 74 kg Muskelmasse).

**Allerdings**: Ohne die exakten Werte aus dem PDF wuerde ich nur schaetzen. Besser: Die PDF nochmals durch die Edge Function schicken, die jetzt korrekt konfiguriert ist.

#### Schritt 2: Edge Function Prompt verbessern

Den System-Prompt der Edge Function anpassen, um explizit nach der "Segmentanalyse Muskel" Seite zu suchen und die Muskelwerte in kg pro Segment zu extrahieren. Auch BMR expliziter anfragen.

#### Schritt 3: Daten korrigieren

Die PDF nochmals importieren (oder die korrigierten Werte direkt via SQL einfuegen). Da der vorherige Import ein `upsert` mit `ignoreDuplicates: true` nutzt, muss der bestehende Datensatz zuerst aktualisiert oder geloescht werden, damit ein erneuter Import greift.

**Option**: `ignoreDuplicates` auf `false` aendern bzw. den Upsert so konfigurieren, dass bestehende Eintraege aktualisiert werden. Aktuell werden Duplikate ignoriert — ein erneuter Import wuerde also nichts aendern.

#### Schritt 4: Upsert-Logik fixen

In `useBodyScans.ts`: `ignoreDuplicates: true` zu `ignoreDuplicates: false` aendern, damit ein erneuter Import dieselben Daten aktualisiert statt ignoriert.

### Zusammenfassung der Aenderungen

| Datei | Aenderung |
|---|---|
| SQL Migration | Update der April-10-Daten: muscle segments + bmr_kcal |
| `supabase/functions/parse-bodyscan-pdf/index.ts` | Prompt verbessern: explizit nach Muskel-Segmenten und BMR fragen |
| `src/hooks/useBodyScans.ts` | `ignoreDuplicates: false` setzen, damit Re-Imports aktualisieren |

