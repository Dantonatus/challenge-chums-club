import { useState, useCallback, useRef, useEffect } from 'react';
import { useTaskPreferences } from './useTaskPreferences';

export type TransitionEffect = 'matrix' | 'liquid' | 'portal' | 'glitch' | 'particles';

const EFFECTS: TransitionEffect[] = ['matrix', 'liquid', 'portal', 'glitch', 'particles'];
const EFFECT_STORAGE_KEY = 'theme-effect-index';

// Read effect index from localStorage
function getStoredEffectIndex(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const stored = localStorage.getItem(EFFECT_STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    return isNaN(parsed) ? 0 : parsed % EFFECTS.length;
  } catch {
    return 0;
  }
}

export function useThemeTransition() {
  const { preferences, setPreferences } = useTaskPreferences();
  
  // Use ref to maintain stable effect index across re-renders
  const effectIndexRef = useRef<number>(getStoredEffectIndex());
  const [effectIndex, setEffectIndex] = useState(effectIndexRef.current);
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Compute isDark once and store it
  const isDark = preferences.theme === 'dark' || 
    (preferences.theme === 'system' && 
     typeof window !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches);

  const currentEffect = EFFECTS[effectIndex];
  
  const getNextEffect = useCallback(() => {
    return EFFECTS[(effectIndex + 1) % EFFECTS.length];
  }, [effectIndex]);

  // Toggle theme - forces to explicit light/dark (not system)
  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    setPreferences({ theme: newTheme });
  }, [isDark, setPreferences]);

  // Advance to next effect - called AFTER animation completes
  const advanceEffect = useCallback(() => {
    const nextIndex = (effectIndexRef.current + 1) % EFFECTS.length;
    effectIndexRef.current = nextIndex;
    setEffectIndex(nextIndex);
    try {
      localStorage.setItem(EFFECT_STORAGE_KEY, String(nextIndex));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false;

  return {
    isTransitioning,
    setIsTransitioning,
    currentEffect,
    effectIndex,
    isDark,
    getNextEffect,
    toggleTheme,
    advanceEffect,
    prefersReducedMotion,
  };
}
