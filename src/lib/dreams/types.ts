export interface DreamEntry {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  entry_date: string;
  entry_time: string | null;
  mood: string | null;
  vividness: number | null;
  sleep_quality: number | null;
  is_lucid: boolean;
  is_recurring: boolean;
  emotions: string[] | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export const MOODS = [
  { value: 'anxious', emoji: '😰', label: 'Ängstlich', gradient: 'from-indigo-900 to-purple-900' },
  { value: 'neutral', emoji: '😐', label: 'Neutral', gradient: 'from-slate-700 to-slate-800' },
  { value: 'happy', emoji: '😊', label: 'Fröhlich', gradient: 'from-amber-700 to-yellow-600' },
  { value: 'excited', emoji: '😍', label: 'Begeistert', gradient: 'from-rose-700 to-pink-600' },
  { value: 'mindblown', emoji: '🤯', label: 'Mind-Blown', gradient: 'from-cyan-700 to-teal-600' },
] as const;

export const EMOTIONS = [
  { value: 'fear', label: 'Angst', color: 'bg-red-500/20 text-red-300 border-red-500/30' },
  { value: 'joy', label: 'Freude', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { value: 'nostalgia', label: 'Nostalgie', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { value: 'confusion', label: 'Verwirrung', color: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  { value: 'sadness', label: 'Trauer', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  { value: 'euphoria', label: 'Euphorie', color: 'bg-pink-500/20 text-pink-300 border-pink-500/30' },
  { value: 'peace', label: 'Frieden', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  { value: 'anger', label: 'Wut', color: 'bg-red-600/20 text-red-400 border-red-600/30' },
] as const;

export type MoodValue = typeof MOODS[number]['value'];
export type EmotionValue = typeof EMOTIONS[number]['value'];
