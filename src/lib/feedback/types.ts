export type FeedbackCategory = 'strength' | 'improvement' | 'observation' | 'goal';
export type FeedbackSentiment = 'positive' | 'neutral' | 'constructive';

export interface FeedbackEmployee {
  id: string;
  user_id: string;
  name: string;
  role: string | null;
  color: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeedbackEntry {
  id: string;
  employee_id: string;
  user_id: string;
  content: string;
  category: FeedbackCategory;
  sentiment: FeedbackSentiment;
  entry_date: string;
  is_shared: boolean;
  shared_at: string | null;
  created_at: string;
  updated_at: string;
}
