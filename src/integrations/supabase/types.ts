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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          color: string
          contact_email: string | null
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          notes: string | null
          start_date: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          contact_email?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          contact_email?: string | null
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          notes?: string | null
          start_date?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gantt_tasks: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_completed: boolean
          project_id: string
          sort_order: number
          start_date: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_completed?: boolean
          project_id: string
          sort_order?: number
          start_date: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_completed?: boolean
          project_id?: string
          sort_order?: number
          start_date?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gantt_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      milestones: {
        Row: {
          attendees: string[] | null
          client_id: string
          completed_at: string | null
          created_at: string | null
          date: string
          description: string | null
          id: string
          is_completed: boolean | null
          location: string | null
          milestone_type: string
          priority: string | null
          project_id: string | null
          time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attendees?: string[] | null
          client_id: string
          completed_at?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          location?: string | null
          milestone_type?: string
          priority?: string | null
          project_id?: string | null
          time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attendees?: string[] | null
          client_id?: string
          completed_at?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          id?: string
          is_completed?: boolean | null
          location?: string | null
          milestone_type?: string
          priority?: string | null
          project_id?: string | null
          time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "planning_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      planning_projects: {
        Row: {
          client_id: string
          color: string | null
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          sort_order: number | null
          start_date: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          sort_order?: number | null
          start_date: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          start_date?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planning_projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
