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
  // Build scale daily averages
  const scaleDays = new Map<string, { sum: number; count: number; time: string }>();
  for (const e of scaleEntries) {
    if (e.weight_kg === null) continue;
    const date = e.measured_at.slice(0, 10);
    const existing = scaleDays.get(date);
    if (existing) {
      existing.sum += e.weight_kg;
      existing.count += 1;
    } else {
      scaleDays.set(date, { sum: e.weight_kg, count: 1, time: e.measured_at.slice(11, 16) });
    }
  }

  const result = new Map<string, UnifiedWeightEntry>();

  // Add manual entries first
  for (const e of manualEntries) {
    result.set(e.date, {
      ...e,
      source: 'manual',
    });
  }

  // Overlay scale entries (overwrite manual on same date)
  for (const [date, data] of scaleDays) {
    const avg = Math.round((data.sum / data.count) * 100) / 100;
    result.set(date, {
      id: `scale-${date}`,
      user_id: '',
      date,
      time: data.time,
      weight_kg: avg,
      created_at: '',
      source: 'scale',
    });
  }

  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date));
}
