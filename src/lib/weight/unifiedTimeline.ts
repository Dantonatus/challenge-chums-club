import type { WeightEntry } from './types';
import type { SmartScaleEntry } from '@/lib/smartscale/types';

export interface UnifiedWeightEntry extends WeightEntry {
  source: 'manual' | 'scale';
}

/**
 * Merge manual weight_entries and smart_scale_entries into a single timeline.
 * Smart-scale entries are averaged per day. When both sources have the same date,
 * the scale value takes precedence (more precise measurement).
 */
export function mergeWeightSources(
  manualEntries: WeightEntry[],
  scaleEntries: SmartScaleEntry[],
): UnifiedWeightEntry[] {
  const result = new Map<string, UnifiedWeightEntry>();

  // Manuelle Eintraege
  for (const e of manualEntries) {
    const key = `${e.date}_${e.time ?? '00:00'}`;
    result.set(key, { ...e, source: 'manual' });
  }

  // Scale-Eintraege einzeln (ueberschreiben manuelle bei gleicher Zeit)
  for (const e of scaleEntries) {
    if (e.weight_kg === null) continue;
    const date = e.measured_at.slice(0, 10);
    const time = e.measured_at.slice(11, 16);
    const key = `${date}_${time}`;
    result.set(key, {
      id: e.id,
      user_id: e.user_id,
      date,
      time,
      weight_kg: e.weight_kg,
      created_at: e.created_at,
      source: 'scale',
    });
  }

  return [...result.values()].sort((a, b) =>
    a.date === b.date
      ? (a.time ?? '').localeCompare(b.time ?? '')
      : a.date.localeCompare(b.date)
  );
}
