import { useState, useCallback, useEffect } from 'react';
import { useTaskPreferences } from './useTaskPreferences';

export type TransitionEffect = 'matrix' | 'liquid' | 'portal' | 'glitch' | 'particles';

const EFFECTS: TransitionEffect[] = ['matrix', 'liquid', 'portal', 'glitch', 'particles'];
const EFFECT_STORAGE_KEY = 'theme-effect-index';

interface ThemeTransitionState {
  isTransitioning: boolean;
  currentEffect: TransitionEffect;
  effectIndex: number;
  isDark: boolean;
}

export function useThemeTransition() {
  const { preferences, setPreferences } = useTaskPreferences();
  
  const [effectIndex, setEffectIndex] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem(EFFECT_STORAGE_KEY);
    return stored ? parseInt(stored, 10) % EFFECTS.length : 0;
  });
  
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const isDark = preferences.theme === 'dark' || 
    (preferences.theme === 'system' && 
     typeof window !== 'undefined' && 
     window.matchMedia('(prefers-color-scheme: dark)').matches);

  const currentEffect = EFFECTS[effectIndex];
  
  const getNextEffect = useCallback(() => {
    return EFFECTS[(effectIndex + 1) % EFFECTS.length];
  }, [effectIndex]);

  const triggerTransition = useCallback((onThemeSwitch: () => void) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Store the callback to be called at the right time during the effect
    return {
      onThemeSwitch,
      onComplete: () => {
        // Update effect index for next time
        const nextIndex = (effectIndex + 1) % EFFECTS.length;
        setEffectIndex(nextIndex);
        localStorage.setItem(EFFECT_STORAGE_KEY, String(nextIndex));
        setIsTransitioning(false);
      }
    };
  }, [isTransitioning, effectIndex]);

  const toggleTheme = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    setPreferences({ theme: newTheme });
  }, [isDark, setPreferences]);

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
    triggerTransition,
    toggleTheme,
    prefersReducedMotion,
  };
}
