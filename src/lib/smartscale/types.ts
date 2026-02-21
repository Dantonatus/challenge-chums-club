export interface SmartScaleEntry {
  id: string;
  user_id: string;
  measured_at: string; // ISO timestamp
  weight_kg: number | null;
  bmi: number | null;
  fat_percent: number | null;
  subcutaneous_fat_percent: number | null;
  heart_rate_bpm: number | null;
  cardiac_index: number | null;
  visceral_fat: number | null;
  body_water_percent: number | null;
  skeletal_muscle_percent: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  protein_percent: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
  created_at: string;
}

export interface ParsedScaleEntry {
  measured_at: string; // ISO timestamp
  weight_kg: number | null;
  bmi: number | null;
  fat_percent: number | null;
  subcutaneous_fat_percent: number | null;
  heart_rate_bpm: number | null;
  cardiac_index: number | null;
  visceral_fat: number | null;
  body_water_percent: number | null;
  skeletal_muscle_percent: number | null;
  muscle_mass_kg: number | null;
  bone_mass_kg: number | null;
  protein_percent: number | null;
  bmr_kcal: number | null;
  metabolic_age: number | null;
}
