

## Fix: Meilenstein-Label-Ueberlappung bei nahen Terminen

### Problem

Wenn mehrere Meilensteine zeitlich nah beieinander liegen (z.B. 19. Juni, 26. Juni, 1. Juli), ueberlappen sich die 140px breiten Text-Labels -- auch das Stagger-System (oben/unten) reicht bei 3+ Clustern nicht aus.

### Loesung: Dynamisches Spreading mit Verbindungslinien

Labels werden horizontal auseinandergeschoben, wenn sie sich ueberlappen wuerden. Die Verbindungslinie zeigt weiterhin zum tatsaechlichen Milestone-Icon, sodass die zeitliche Zuordnung klar bleibt.

```text
Vorher (ueberlappend):         Nachher (gespreizt):

   19.Jun  1.Jul                 19.Jun    26.Jun    1.Jul
   Go-LiveStart SaaS             Go-Live   Deadline  Start SaaS
     |  |                          \         |        /
     ◎  ◎                          ◎        ◎       ◎
     26.Jun                     
     Deadline                   
```

### Aenderungen

**`src/components/planning/ClientPeriodBar.tsx`**

1. **Collision-Detection in `enrichedPositions`**: Nach dem Stagger-Schritt werden Label-Positionen auf Ueberlappung geprueft. Jedes Label hat eine effektive Breite (~8% der Gesamtbreite, entspricht ~140px). Wenn sich zwei Labels ueberlappen, werden sie symmetrisch auseinandergeschoben (`nudgeLeft`-Offset).

2. **Getrennte Label- und Icon-Positionierung**: Das Icon bleibt an der echten Zeitposition (`left`). Das Label bekommt eine verschobene Position (`displayLeft`). Die Verbindungslinie wird schraeg gezeichnet (vom Label-Zentrum zum Icon), statt nur vertikal.

3. **Schraege Verbindungslinie**: Statt `w-0.5 h-3` wird ein SVG-Line-Element oder ein `transform: rotate()` verwendet, das vom Label-Mittelpunkt zum Icon zeigt. So bleibt die visuelle Zuordnung auch bei verschobenen Labels klar.

4. **Algorithmus** (Pseudo):
```text
for each label pair (i, i+1):
  overlap = (labelWidth / 2 + labelWidth / 2) - abs(pos[i+1] - pos[i])
  if overlap > 0:
    pos[i] -= overlap / 2
    pos[i+1] += overlap / 2
repeat until no overlaps (max 3 iterations)
```

### Keine weiteren Dateien betroffen

Die Aenderung ist auf `ClientPeriodBar.tsx` beschraenkt. Das Label-Rendering und die Position-Berechnung im `enrichedPositions`-Memo werden erweitert; die restliche Logik (Icons, Tooltips, Bar-Rendering) bleibt identisch.

