
# Fix: Matrix Animation Smooth + Effekt-Rotation

## Problem-Analyse

Die aktuelle Implementation hat mehrere kritische Bugs:

1. **Canvas-Neustart bei Theme-Wechsel**: Der `useEffect` in allen Effect-Komponenten hat `isDark` als Dependency. Sobald der Theme-Switch mitten in der Animation passiert, wird der Canvas abgebrochen und neu gestartet → Flackern
2. **Button hängt fest**: Wenn die Animation abbricht ohne `onComplete` aufzurufen, bleibt `animationState.isRunning = true` → Button disabled
3. **Effekt-Rotation funktioniert nicht**: Der Index wird zwar hochgezählt, aber durch mehrfache State-Updates und Race Conditions startet immer derselbe Effekt

## Lösung

### Strategie: "Immutable isDark during animation"

Der `isDark`-Wert wird beim **Start** der Animation eingefroren und ändert sich während der Animation NICHT mehr. Der Canvas-Effekt bekommt `startedAsDark` statt `isDark`.

### Änderungen

---

### Datei 1: `src/components/ui/MatrixDarkModeToggle.tsx`

**Problem:** Übergibt `effectIsDark` an Effects, aber Effects haben `isDark` in Dependencies

**Fix:**
- Entferne `isDark` aus den Effect-Komponenten Props - sie bekommen nur noch `startedAsDark`
- Rename prop von `isDark` zu `startedAsDark` für Klarheit
- Füge Safety-Timeout hinzu der `animationState` zurücksetzt falls Animation hängt

```
// Prop-Änderung für alle Effects:
<MatrixRain
  isActive={true}
  onThemeSwitch={handleThemeSwitch}
  onComplete={handleComplete}
  startedAsDark={animationState.startedAsDark}  // ← Nicht mehr isDark
/>

// Safety-Reset nach 3 Sekunden falls Animation hängt
useEffect(() => {
  if (!animationState.isRunning) return;
  const timeout = setTimeout(() => {
    setAnimationState({ isRunning: false, effect: null, startedAsDark: false });
  }, 3000);
  return () => clearTimeout(timeout);
}, [animationState.isRunning]);
```

---

### Datei 2: `src/components/ui/effects/MatrixRain.tsx`

**Problem:** 
- `isDark` in useEffect-Dependencies verursacht Canvas-Neustart
- Trail-Effekt mit semi-transparentem Clear ist instabil

**Fix:**
1. Rename `isDark` prop zu `startedAsDark`
2. Entferne `startedAsDark` aus useEffect-Dependencies - nur `isActive` triggert Neustart
3. Speichere `startedAsDark` in einem Ref beim Start und nutze das für die gesamte Animation
4. Ersetze den Trail-Effekt durch vollständiges Canvas-Clear + explizites Trail-Array

```typescript
// Neuer Ansatz: Store initial dark state in ref
const startedAsDarkRef = useRef(startedAsDark);
useEffect(() => {
  if (isActive) {
    startedAsDarkRef.current = startedAsDark;
  }
}, [isActive, startedAsDark]);

// In useEffect: nur [isActive] als dependency
useEffect(() => {
  if (!isActive) {
    // cleanup
    return;
  }
  
  const wasDark = startedAsDarkRef.current;
  // ... rest of animation using wasDark (not isDark)
}, [isActive]);  // ← KEINE isDark dependency mehr!
```

**Trail-Fix für smoothere Animation:**
```typescript
// Statt semi-transparent clear: Voller Clear + Trail-Buffer
const trailBuffer: {x: number, y: number, char: string, age: number}[][] = [];

// In animate():
ctx.fillStyle = wasDark ? '#000000' : '#ffffff';
ctx.clearRect(0, 0, canvas.width, canvas.height);

// Draw trails from buffer with decreasing opacity
trailBuffer.forEach((columnTrail, colIndex) => {
  columnTrail.forEach((item, idx) => {
    const opacity = 1 - (item.age / 10);
    ctx.fillStyle = `rgba(0, 255, 136, ${opacity * globalAlpha})`;
    ctx.fillText(item.char, item.x, item.y);
    item.age++;
  });
  // Remove old trail items
  trailBuffer[colIndex] = columnTrail.filter(item => item.age < 10);
});
```

---

### Datei 3-6: Alle anderen Effects

**Gleiches Pattern anwenden:**
- `LiquidMorph.tsx`: `isDark` → `startedAsDark`, aus Dependencies entfernen
- `PortalWarp.tsx`: `isDark` → `startedAsDark`, aus Dependencies entfernen
- `GlitchEffect.tsx`: `isDark` → `startedAsDark`, aus Dependencies entfernen
- `ParticleExplosion.tsx`: `isDark` → `startedAsDark`, aus Dependencies entfernen

---

### Datei 7: `src/hooks/useThemeTransition.ts`

**Problem:** `effectIndex` kann durch React re-renders auf 0 zurückgesetzt werden

**Fix:** 
- Lese `effectIndex` direkt aus localStorage bei jedem Render (nicht nur initial)
- Nutze `useSyncExternalStore` oder ref-basierte Lösung für stabilen Index

```typescript
// Stabiler Index mit ref
const effectIndexRef = useRef(() => {
  const stored = localStorage.getItem(EFFECT_STORAGE_KEY);
  const parsed = stored ? parseInt(stored, 10) : 0;
  return isNaN(parsed) ? 0 : parsed % EFFECTS.length;
})();

const [effectIndex, setEffectIndex] = useState(effectIndexRef.current);

// Sync ref mit state
useEffect(() => {
  effectIndexRef.current = effectIndex;
}, [effectIndex]);
```

---

## Zusammenfassung der Fixes

| Problem | Ursache | Lösung |
|---------|---------|--------|
| Flackern | `isDark` ändert sich mid-animation | `startedAsDark` in Ref einfrieren |
| Button hängt | Animation bricht ab ohne onComplete | Safety-Timeout + bessere Cleanup |
| Immer Matrix | effectIndex wird resettet | localStorage-basierter stabiler Index |
| Trail unsauber | Semi-transparent clear akkumuliert | Voller Clear + Trail-Buffer |

## Dateien die geändert werden

1. `src/components/ui/MatrixDarkModeToggle.tsx` - Safety-Reset, Prop-Rename
2. `src/components/ui/effects/MatrixRain.tsx` - Dependencies fix, Trail-Buffer
3. `src/components/ui/effects/LiquidMorph.tsx` - Dependencies fix
4. `src/components/ui/effects/PortalWarp.tsx` - Dependencies fix
5. `src/components/ui/effects/GlitchEffect.tsx` - Dependencies fix
6. `src/components/ui/effects/ParticleExplosion.tsx` - Dependencies fix
7. `src/hooks/useThemeTransition.ts` - Stabiler effectIndex

