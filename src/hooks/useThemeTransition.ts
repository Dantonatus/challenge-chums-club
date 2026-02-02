import { useState, useCallback, useRef, useEffect } from 'react';
import { useTaskPreferences } from './useTaskPreferences';

export type TransitionEffect = 'matrix' | 'liquid' | 'portal' | 'glitch' | 'particles';

const EFFECTS: TransitionEffect[] = ['matrix', 'liquid', 'portal', 'glitch', 'particles'];
const EFFECT_STORAGE_KEY = 'theme-effect-index';

export function useThemeTransition() {
  const { preferences, setPreferences } = useTaskPreferences();
  
  // Initialize effect index from localStorage
  const [effectIndex, setEffectIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(EFFECT_STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : 0;
    return isNaN(parsed) ? 0 : parsed % EFFECTS.length;
  });
  
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

  // Toggle theme - simple, direct
  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    setPreferences({ theme: newTheme });
  }, [isDark, setPreferences]);

  // Advance to next effect - called AFTER animation completes
  const advanceEffect = useCallback(() => {
    setEffectIndex(prev => {
      const nextIndex = (prev + 1) % EFFECTS.length;
      localStorage.setItem(EFFECT_STORAGE_KEY, String(nextIndex));
      return nextIndex;
    });
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
