export interface WeightEntry {
  id: string;
  user_id: string;
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  weight_kg: number;
  created_at: string;
}

export interface ForecastSnapshot {
  id: string;
  user_id: string;
  created_at: string;
  snapshot_date: string;
  forecast_days: number;
  daily_swing: number;
  points_json: { date: string; value: number; simulated: number; lower: number; upper: number }[];
}
