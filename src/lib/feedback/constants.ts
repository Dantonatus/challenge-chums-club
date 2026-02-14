import { FeedbackCategory, FeedbackSentiment } from './types';

export const CATEGORIES: { value: FeedbackCategory; label: string; color: string }[] = [
  { value: 'strength', label: 'Stärke', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  { value: 'improvement', label: 'Entwicklungsfeld', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  { value: 'observation', label: 'Beobachtung', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { value: 'goal', label: 'Ziel', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
];

export const SENTIMENTS: { value: FeedbackSentiment; label: string; dotColor: string }[] = [
  { value: 'positive', label: 'Positiv', dotColor: 'bg-emerald-500' },
  { value: 'neutral', label: 'Neutral', dotColor: 'bg-slate-400' },
  { value: 'constructive', label: 'Konstruktiv', dotColor: 'bg-orange-500' },
];

export const EMPLOYEE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F97316', '#10B981',
  '#06B6D4', '#EF4444', '#84CC16', '#F59E0B', '#6366F1',
];
