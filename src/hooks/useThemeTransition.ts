import { useState, useCallback, useRef } from 'react';
import { useTaskPreferences } from './useTaskPreferences';

export type TransitionEffect = 'matrix' | 'liquid' | 'portal' | 'glitch' | 'particles';

const EFFECTS: TransitionEffect[] = ['matrix', 'liquid', 'portal', 'glitch', 'particles'];
const EFFECT_STORAGE_KEY = 'theme-effect-index';

export function useThemeTransition() {
  const { preferences, setPreferences } = useTaskPreferences();
  
  const [effectIndex, setEffectIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(EFFECT_STORAGE_KEY);
    return stored ? parseInt(stored, 10) % EFFECTS.length : 0;
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Use refs for stable callback references
  const effectIndexRef = useRef(effectIndex);
  effectIndexRef.current = effectIndex;
  
  const isDark = preferences.theme === 'dark' || 
    (preferences.theme === 'system' && 
     typeof window !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const isDarkRef = useRef(isDark);
  isDarkRef.current = isDark;

  const currentEffect = EFFECTS[effectIndex];
  
  const getNextEffect = useCallback(() => {
    return EFFECTS[(effectIndexRef.current + 1) % EFFECTS.length];
  }, []);

  const toggleTheme = useCallback(() => {
    const newTheme = isDarkRef.current ? 'light' : 'dark';
    setPreferences({ theme: newTheme });
  }, [setPreferences]);

  const advanceEffect = useCallback(() => {
    const nextIndex = (effectIndexRef.current + 1) % EFFECTS.length;
    setEffectIndex(nextIndex);
    localStorage.setItem(EFFECT_STORAGE_KEY, String(nextIndex));
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
