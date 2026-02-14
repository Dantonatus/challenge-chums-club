import type { ParsedBodyScan, BodyScanSegments } from './types';

/**
 * Parses a TANITA MC-780 CSV file (one scan per file).
 * Columns: scan_id,datetime_local,date_dmy,time_local,device,profile,sex,age_years,height_cm,pt_kg,
 *          category,metric,submetric,side_or_segment,value,unit,desirable_low,desirable_high,target,target_diff
 */
export function parseBodyScanCsv(text: string): ParsedBodyScan | null {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return null;

  const sep = lines[1].includes(';') ? ';' : ',';

  let scanDate = '';
  let scanTime = '';
  let device = 'TANITA MC-780';
  let ageYears: number | null = null;
  let heightCm: number | null = null;

  const values: Record<string, number | string> = {};

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 15) continue;

    // Extract metadata from first data row
    if (!scanDate) {
      // datetime_local = "2026-01-06 17:06" → extract date part
      const dtParts = (cols[1] || '').split(' ');
      scanDate = dtParts[0] || '';
      scanTime = cols[3] || '';
      device = cols[4] || 'TANITA MC-780';
      ageYears = parseFloat(cols[7]) || null;
      heightCm = parseFloat(cols[8]) || null;
    }

    const category = cols[10];
    const metric = cols[11];
    const submetric = cols[12];
    const sideOrSegment = cols[13];
    const rawValue = cols[14];

    const val = parseFloat(rawValue);
    const key = [category, metric, submetric, sideOrSegment].filter(Boolean).join('.');

    if (!isNaN(val)) {
      values[key] = val;
    } else if (rawValue) {
      values[key] = rawValue;
    }
  }

  if (!scanDate) return null;

  // Build segments
  const segments: BodyScanSegments = {
    muscle: {
      trunk: (values['segment_muscle.muscle_mass.trunk'] as number) ?? 0,
      armL: (values['segment_muscle.muscle_mass.arm.L'] as number) ?? 0,
      armR: (values['segment_muscle.muscle_mass.arm.R'] as number) ?? 0,
      legL: (values['segment_muscle.muscle_mass.leg.L'] as number) ?? 0,
      legR: (values['segment_muscle.muscle_mass.leg.R'] as number) ?? 0,
    },
    fat: {
      trunk: (values['segment_fat.fat_percent.trunk'] as number) ?? 0,
      armL: (values['segment_fat.fat_percent.arm.L'] as number) ?? 0,
      armR: (values['segment_fat.fat_percent.arm.R'] as number) ?? 0,
      legL: (values['segment_fat.fat_percent.leg.L'] as number) ?? 0,
      legR: (values['segment_fat.fat_percent.leg.R'] as number) ?? 0,
    },
  };

  return {
    scan_date: scanDate,
    scan_time: scanTime,
    device,
    age_years: ageYears,
    height_cm: heightCm,
    weight_kg: (values['details.weight'] as number) ?? null,
    fat_percent: (values['details.fat_percent'] as number) ?? null,
    fat_mass_kg: (values['details.fat_mass'] as number) ?? null,
    muscle_mass_kg: (values['details.muscle_mass'] as number) ?? null,
    bone_mass_kg: (values['details.bone_mass'] as number) ?? null,
    bmi: (values['details.bmi'] as number) ?? null,
    metabolic_age: (values['details.metabolic_age'] as number) != null ? Math.round(values['details.metabolic_age'] as number) : null,
    tbw_kg: (values['composition.tbw.kg'] as number) ?? null,
    tbw_percent: (values['composition.tbw.percent'] as number) ?? null,
    ecw_kg: (values['composition.ecw'] as number) ?? null,
    icw_kg: (values['composition.icw'] as number) ?? null,
    ecw_tbw_ratio: (values['composition.ecw_tbw_ratio'] as number) ?? null,
    bmr_kcal: (values['metabolism.bmr.kcal'] as number) ?? null,
    visceral_fat: (values['risk.visceral_fat_rating'] as number) != null ? Math.round(values['risk.visceral_fat_rating'] as number) : null,
    physique_text: (values['physique.physique_rating.position_text'] as string) ?? null,
    segments_json: segments,
  };
}
