import type { ParsedBodyScan, BodyScanSegments } from './types';

/**
 * Parse a German decimal number string like "95,9" → 95.9
 */
function parseDE(str: string | undefined): number | null {
  if (!str) return null;
  const cleaned = str.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function matchFirst(text: string, pattern: RegExp): string | null {
  const m = text.match(pattern);
  return m ? m[1] : null;
}

/**
 * Parses extracted text from a TANITA MC-780 PDF report.
 * Expects the full text content (all pages concatenated).
 */
export function parseBodyScanPdf(text: string): ParsedBodyScan | null {
  if (!text || text.length < 50) return null;

  // Date & time: "Datum 10.04.2026 20:30:06" or "10.04.2026 20:30:06"
  const dateMatch = text.match(/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}:\d{2}:\d{2})/);
  if (!dateMatch) return null;

  const scanDate = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
  const scanTime = dateMatch[4];

  // Device model
  const modelMatch = text.match(/Modell\s+(MC-\d+\w*)/i);
  const device = modelMatch ? `TANITA ${modelMatch[1]}` : 'TANITA MC-780';

  // Main metrics — use flexible patterns for German formatting
  const weightKg = parseDE(matchFirst(text, /Gewicht\s+([\d,]+)\s*kg/));
  const fatPercent = parseDE(matchFirst(text, /Fettanteil\s+([\d,]+)\s*%/));
  const fatMassKg = parseDE(matchFirst(text, /Fettmasse\s+([\d,]+)\s*kg/));
  const muscleMassKg = parseDE(matchFirst(text, /Muskelmasse\s+([\d,]+)\s*kg/));
  const visceralFat = parseDE(matchFirst(text, /(?:Level\s+)?Viszeralfett\s+([\d,]+)/));
  const bmi = parseDE(matchFirst(text, /BMI\s+([\d,]+)/));
  const metabolicAge = parseDE(matchFirst(text, /Stoffwechselalter\s+([\d,]+)/));
  const boneMassKg = parseDE(matchFirst(text, /Knochen\s+([\d,]+)\s*kg/));

  // BMR — may appear as "Grundumsatz 2345 kcal" 
  const bmrKcal = parseDE(matchFirst(text, /Grundumsatz\s+([\d,.]+)\s*kcal/i));

  // Water
  // "Wasser 55,3 kg" and "Gesamt 57,7 %" 
  const tbwKg = parseDE(matchFirst(text, /Wasser\s+([\d,]+)\s*kg/));
  const tbwPercent = parseDE(matchFirst(text, /Gesamt\s+([\d,]+)\s*%/));
  const ecwKg = parseDE(matchFirst(text, /ECW\s+([\d,]+)\s*kg/));
  const icwKg = parseDE(matchFirst(text, /ICW\s+([\d,]+)\s*kg/));
  const ecwTbwRatio = parseDE(matchFirst(text, /ECW\/TBW\s+([\d,]+)\s*%/));

  // Age (from header)
  const ageYears = parseDE(matchFirst(text, /Alter\s+(\d+)/));
  // Height
  const heightCm = parseDE(matchFirst(text, /Gr[öo](?:ß|ss)e\s+([\d,]+)\s*cm/i));

  // Segment analysis — fat
  // Pattern: "Rumpf 11,0 kg (20,7 %)" then "Arm 0,9 kg (15,8 %)" R/L, "Bein 2,6 kg (16,4 %)" R/L
  const segFat: BodyScanSegments['fat'] = { trunk: 0, armR: 0, armL: 0, legR: 0, legL: 0 };
  const segMuscle: BodyScanSegments['muscle'] = { trunk: 0, armR: 0, armL: 0, legR: 0, legL: 0 };

  // Fat segments — section "Segmentanalyse Fett"
  const fatSection = text.match(/Segmentanalyse\s+Fett([\s\S]*?)(?:TANITA|Segmentanalyse\s+(?!Fett)|Muskul|$)/i);
  if (fatSection) {
    const fs = fatSection[1];
    const trunkFat = fs.match(/Rumpf\s+[\d,]+\s*kg\s*\(([\d,]+)\s*%\)/);
    if (trunkFat) segFat.trunk = parseDE(trunkFat[1]) ?? 0;

    // R side comes first in the PDF
    const armFatAll = [...fs.matchAll(/Arm\s+([\d,]+)\s*kg\s*\(([\d,]+)\s*%\)/g)];
    if (armFatAll.length >= 2) {
      segFat.armR = parseDE(armFatAll[0][2]) ?? 0;
      segFat.armL = parseDE(armFatAll[1][2]) ?? 0;
    }
    const legFatAll = [...fs.matchAll(/Bein\s+([\d,]+)\s*kg\s*\(([\d,]+)\s*%\)/g)];
    if (legFatAll.length >= 2) {
      segFat.legR = parseDE(legFatAll[0][2]) ?? 0;
      segFat.legL = parseDE(legFatAll[1][2]) ?? 0;
    }
  }

  // Muscle segments — the PDF has "Muskuläre Analyse" with segment muscle masses
  // but the parsed text may not have clear segment muscle data. 
  // We'll try to extract from "Segmentanalyse Muskel" if present
  const muscleSection = text.match(/Segmentanalyse\s+Musk(?:el|ulatur)([\s\S]*?)(?:TANITA|Segmentanalyse|$)/i);
  if (muscleSection) {
    const ms = muscleSection[1];
    const trunkMuscle = ms.match(/Rumpf\s+([\d,]+)\s*kg/);
    if (trunkMuscle) segMuscle.trunk = parseDE(trunkMuscle[1]) ?? 0;

    const armMuscleAll = [...ms.matchAll(/Arm\s+([\d,]+)\s*kg/g)];
    if (armMuscleAll.length >= 2) {
      segMuscle.armR = parseDE(armMuscleAll[0][1]) ?? 0;
      segMuscle.armL = parseDE(armMuscleAll[1][1]) ?? 0;
    }
    const legMuscleAll = [...ms.matchAll(/Bein\s+([\d,]+)\s*kg/g)];
    if (legMuscleAll.length >= 2) {
      segMuscle.legR = parseDE(legMuscleAll[0][1]) ?? 0;
      segMuscle.legL = parseDE(legMuscleAll[1][1]) ?? 0;
    }
  }

  const hasSegments = segFat.trunk > 0 || segMuscle.trunk > 0;

  return {
    scan_date: scanDate,
    scan_time: scanTime,
    device,
    age_years: ageYears,
    height_cm: heightCm,
    weight_kg: weightKg,
    fat_percent: fatPercent,
    fat_mass_kg: fatMassKg,
    muscle_mass_kg: muscleMassKg,
    bone_mass_kg: boneMassKg,
    bmi,
    metabolic_age: metabolicAge != null ? Math.round(metabolicAge) : null,
    tbw_kg: tbwKg,
    tbw_percent: tbwPercent,
    ecw_kg: ecwKg,
    icw_kg: icwKg,
    ecw_tbw_ratio: ecwTbwRatio,
    bmr_kcal: bmrKcal,
    visceral_fat: visceralFat != null ? Math.round(visceralFat) : null,
    physique_text: null,
    segments_json: hasSegments ? { muscle: segMuscle, fat: segFat } : null,
  };
}
