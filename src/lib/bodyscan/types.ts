export interface BodyScanSegments {
  muscle: {
    trunk: number;
    armL: number;
    armR: number;
    legL: number;
    legR: number;
  };
  fat: {
    trunk: number;
    armL: number;
    armR: number;
    legL: number;
    legR: number;
  };
}

export interface BodyScan {
  id: string;
  user_id: string;
  scan_date: string;
  scan_time: string;
  device: string;
  age_years: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fat_percent: number | null;
  fat_mass_kg: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  bmi: number | null;
  metabolic_age: number | null;
  tbw_kg: number | null;
  tbw_percent: number | null;
  ecw_kg: number | null;
  icw_kg: number | null;
  ecw_tbw_ratio: number | null;
  bmr_kcal: number | null;
  visceral_fat: number | null;
  physique_text: string | null;
  segments_json: BodyScanSegments | null;
  created_at: string;
}

export interface ParsedBodyScan {
  scan_date: string;
  scan_time: string;
  device: string;
  age_years: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  fat_percent: number | null;
  fat_mass_kg: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  bmi: number | null;
  metabolic_age: number | null;
  tbw_kg: number | null;
  tbw_percent: number | null;
  ecw_kg: number | null;
  icw_kg: number | null;
  ecw_tbw_ratio: number | null;
  bmr_kcal: number | null;
  visceral_fat: number | null;
  physique_text: string | null;
  segments_json: BodyScanSegments | null;
}
