import { useState, useEffect, useCallback } from 'react';
import type { TaskPriority } from '@/lib/tasks/types';

export type DefaultView = 'inbox' | 'today' | 'upcoming' | 'calendar';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface TaskPreferences {
  defaultView: DefaultView;
  defaultPriority: TaskPriority;
  reminderEnabled: boolean;
  reminderOffsetMinutes: number | null;
  theme: ThemePreference;
}

const STORAGE_KEY = 'task-preferences';

const DEFAULT_PREFERENCES: TaskPreferences = {
  defaultView: 'today',
  defaultPriority: 'p3',
  reminderEnabled: true,
  reminderOffsetMinutes: 15,
  theme: 'system',
};

/**
 * Hook to manage task preferences stored in localStorage
 * - Default view (Inbox/Today/Upcoming/Calendar)
 * - Default priority for new tasks
 * - Reminder defaults
 * - Theme preference (light/dark/system)
 */
export function useTaskPreferences() {
  const [preferences, setPreferencesState] = useState<TaskPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to parse task preferences:', e);
    }
    return DEFAULT_PREFERENCES;
  });

  // Apply theme on mount and when it changes
  useEffect(() => {
    const root = document.documentElement;
    
    if (preferences.theme === 'system') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemDark);
    } else {
      root.classList.toggle('dark', preferences.theme === 'dark');
    }
  }, [preferences.theme]);

  // Listen for system theme changes when using 'system' preference
  useEffect(() => {
    if (preferences.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [preferences.theme]);

  const setPreferences = useCallback((updates: Partial<TaskPreferences>) => {
    setPreferencesState((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save task preferences:', e);
      }
      return next;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset task preferences:', e);
    }
  }, []);

  return {
    preferences,
    setPreferences,
    resetPreferences,
    DEFAULT_PREFERENCES,
  };
}
