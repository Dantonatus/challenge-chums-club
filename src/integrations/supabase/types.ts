export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      approval_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          penalty_count: number
          penalty_override_cents: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          penalty_count?: number
          penalty_override_cents?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          penalty_count?: number
          penalty_override_cents?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_violations: {
        Row: {
          amount_cents: number
          challenge_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          challenge_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          challenge_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          created_at: string
          created_by: string
          description: string | null
          duration_count: number | null
          duration_type: Database["public"]["Enums"]["challenge_duration_type"]
          end_date: string
          frequency: Database["public"]["Enums"]["challenge_frequency"]
          frequency_count: number | null
          group_id: string
          id: string
          penalty_amount: number
          penalty_cents: number
          start_date: string
          status: Database["public"]["Enums"]["challenge_status"]
          strike_allowance: number
          title: string
          updated_at: string
        }
        Insert: {
          challenge_type?: Database["public"]["Enums"]["challenge_type"]
          created_at?: string
          created_by: string
          description?: string | null
          duration_count?: number | null
          duration_type?: Database["public"]["Enums"]["challenge_duration_type"]
          end_date: string
          frequency?: Database["public"]["Enums"]["challenge_frequency"]
          frequency_count?: number | null
          group_id: string
          id?: string
          penalty_amount?: number
          penalty_cents?: number
          start_date: string
          status?: Database["public"]["Enums"]["challenge_status"]
          strike_allowance?: number
          title: string
          updated_at?: string
        }
        Update: {
          challenge_type?: Database["public"]["Enums"]["challenge_type"]
          created_at?: string
          created_by?: string
          description?: string | null
          duration_count?: number | null
          duration_type?: Database["public"]["Enums"]["challenge_duration_type"]
          end_date?: string
          frequency?: Database["public"]["Enums"]["challenge_frequency"]
          frequency_count?: number | null
          group_id?: string
          id?: string
          penalty_amount?: number
          penalty_cents?: number
          start_date?: string
          status?: Database["public"]["Enums"]["challenge_status"]
          strike_allowance?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string
          group_id: string
          id: string
          role: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          role?: Database["public"]["Enums"]["group_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          description: string | null
          id: string
          invite_code: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          invite_code?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      idea_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          idea_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idea_comments_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      idea_votes: {
        Row: {
          created_at: string
          id: string
          idea_id: string
          user_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          idea_id: string
          user_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          idea_id?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "idea_votes_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      ideas: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          group_id: string
          id: string
          status: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          group_id: string
          id?: string
          status?: Database["public"]["Enums"]["idea_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          group_id?: string
          id?: string
          status?: Database["public"]["Enums"]["idea_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ideas_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          group_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          aggregation_method: string
          challenge_id: string
          created_at: string
          goal_direction: string
          id: string
          kpi_type: string
          measurement_frequency: string
          target_value: number
          unit: string
          updated_at: string
        }
        Insert: {
          aggregation_method?: string
          challenge_id: string
          created_at?: string
          goal_direction?: string
          id?: string
          kpi_type: string
          measurement_frequency?: string
          target_value: number
          unit: string
          updated_at?: string
        }
        Update: {
          aggregation_method?: string
          challenge_id?: string
          created_at?: string
          goal_direction?: string
          id?: string
          kpi_type?: string
          measurement_frequency?: string
          target_value?: number
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_kpi_definitions_challenge"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_measurements: {
        Row: {
          created_at: string
          id: string
          kpi_definition_id: string
          measured_value: number
          measurement_date: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_definition_id: string
          measured_value: number
          measurement_date: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kpi_definition_id?: string
          measured_value?: number
          measurement_date?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_kpi_measurements_definition"
            columns: ["kpi_definition_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      logs: {
        Row: {
          challenge_id: string
          created_at: string
          date: string
          id: string
          note: string | null
          success: boolean
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          date: string
          id?: string
          note?: string | null
          success: boolean
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "logs_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          group_id: string
          id: string
          note: string | null
          period_end: string | null
          period_start: string | null
          related_challenge_id: string | null
          type: Database["public"]["Enums"]["payment_type"]
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          group_id: string
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string | null
          related_challenge_id?: string | null
          type: Database["public"]["Enums"]["payment_type"]
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          group_id?: string
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string | null
          related_challenge_id?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_related_challenge_id_fkey"
            columns: ["related_challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_color: string | null
          display_name: string | null
          id: string
          is_approved: boolean | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_color?: string | null
          display_name?: string | null
          id: string
          is_approved?: boolean | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_color?: string | null
          display_name?: string | null
          id?: string
          is_approved?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_tips: {
        Row: {
          created_at: string
          group_id: string
          id: string
          scheduled_date: string
          status: string
          tip_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          scheduled_date: string
          status?: string
          tip_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          scheduled_date?: string
          status?: string
          tip_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_tips_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_friends: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          status: Database["public"]["Enums"]["friend_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
          status?: Database["public"]["Enums"]["friend_status"]
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_user: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      get_server_time: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_group_member: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      is_group_owner: {
        Args: { _group_id: string; _user_id?: string }
        Returns: boolean
      }
      is_user_approved: {
        Args: { _user_id: string }
        Returns: boolean
      }
      join_group: {
        Args: { p_invite_code: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user" | "pending"
      challenge_duration_type: "weeks" | "months" | "continuous"
      challenge_frequency: "daily" | "weekly" | "times_per_week" | "whole_week"
      challenge_status: "active" | "paused" | "ended"
      challenge_type: "habit" | "kpi"
      friend_status: "pending" | "accepted" | "blocked"
      group_role: "owner" | "admin" | "member"
      idea_status: "proposed" | "approved" | "rejected"
      payment_type: "owed" | "paid" | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "pending"],
      challenge_duration_type: ["weeks", "months", "continuous"],
      challenge_frequency: ["daily", "weekly", "times_per_week", "whole_week"],
      challenge_status: ["active", "paused", "ended"],
      challenge_type: ["habit", "kpi"],
      friend_status: ["pending", "accepted", "blocked"],
      group_role: ["owner", "admin", "member"],
      idea_status: ["proposed", "approved", "rejected"],
      payment_type: ["owed", "paid", "adjustment"],
    },
  },
} as const
