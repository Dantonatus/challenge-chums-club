import { supabase } from "@/integrations/supabase/client";

export interface SavedView {
  id: string;
  name: string;
  filters: {
    participants: string[];
    challengeTypes: string[];
    groups: string[];
  };
  dateRange: {
    start: string;
    end: string;
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveViewRequest {
  name: string;
  filters: {
    participants: string[];
    challengeTypes: string[];
    groups: string[];
  };
  dateRange: {
    start: Date;
    end: Date;
  };
  isDefault?: boolean;
}

/**
 * Save a new view configuration
 */
export async function saveView(viewData: SaveViewRequest): Promise<SavedView> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // If this is set as default, unset other defaults first
  if (viewData.isDefault) {
    await supabase
      .from('saved_views')
      .update({ is_default: false })
      .eq('user_id', user.user.id);
  }

  const { data, error } = await supabase
    .from('saved_views')
    .insert({
      user_id: user.user.id,
      name: viewData.name,
      filters: viewData.filters,
      date_range: {
        start: viewData.dateRange.start.toISOString(),
        end: viewData.dateRange.end.toISOString()
      },
      is_default: viewData.isDefault || false
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    filters: data.filters as any,
    dateRange: {
      start: data.date_range.start,
      end: data.date_range.end
    },
    isDefault: data.is_default,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Get all saved views for the current user
 */
export async function getSavedViews(): Promise<SavedView[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(view => ({
    id: view.id,
    name: view.name,
    filters: view.filters as any,
    dateRange: {
      start: view.date_range.start,
      end: view.date_range.end
    },
    isDefault: view.is_default,
    createdAt: view.created_at,
    updatedAt: view.updated_at
  }));
}

/**
 * Delete a saved view
 */
export async function deleteSavedView(viewId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('saved_views')
    .delete()
    .eq('id', viewId)
    .eq('user_id', user.user.id); // Ensure user can only delete their own views

  if (error) throw error;
}

/**
 * Get the default view for the current user
 */
export async function getDefaultView(): Promise<SavedView | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data, error } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('is_default', true)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    filters: data.filters as any,
    dateRange: {
      start: data.date_range.start,
      end: data.date_range.end
    },
    isDefault: data.is_default,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

/**
 * Set a view as default
 */
export async function setDefaultView(viewId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error('User not authenticated');

  // First, unset all defaults for this user
  await supabase
    .from('saved_views')
    .update({ is_default: false })
    .eq('user_id', user.user.id);

  // Then set the new default
  const { error } = await supabase
    .from('saved_views')
    .update({ is_default: true })
    .eq('id', viewId)
    .eq('user_id', user.user.id);

  if (error) throw error;
}