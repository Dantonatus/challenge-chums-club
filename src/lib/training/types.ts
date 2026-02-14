export interface TrainingCheckin {
  id: string;
  user_id: string;
  checkin_date: string; // YYYY-MM-DD
  checkin_time: string; // HH:MM:SS
  facility_name: string;
  facility_address: string | null;
  created_at: string;
}

export interface ParsedCheckin {
  checkin_date: string;
  checkin_time: string;
  facility_name: string;
  facility_address: string;
}

export type TimeBucket = 'Morgens' | 'Mittags' | 'Nachmittags' | 'Abends' | 'Spät';

export interface WeeklyData {
  week: string;
  visits: number;
}

export interface MonthlyData {
  month: string;
  visits: number;
}

export interface WeekdayData {
  day: string;
  visits: number;
}

export interface TimeBucketData {
  bucket: TimeBucket;
  visits: number;
}
