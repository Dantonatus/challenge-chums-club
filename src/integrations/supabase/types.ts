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
      approval_tokens: {
        Row: {
          created_at: string
          creation_context: Json | null
          expires_at: string
          id: string
          security_hash: string | null
          token: string
          used_at: string | null
          used_by: string | null
          used_from_ip: unknown
          user_id: string
        }
        Insert: {
          created_at?: string
          creation_context?: Json | null
          expires_at: string
          id?: string
          security_hash?: string | null
          token: string
          used_at?: string | null
          used_by?: string | null
          used_from_ip?: unknown
          user_id: string
        }
        Update: {
          created_at?: string
          creation_context?: Json | null
          expires_at?: string
          id?: string
          security_hash?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
          used_from_ip?: unknown
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
      ingredient_matches: {
        Row: {
          created_at: string
          grams: number | null
          id: string
          ingredient_text: string
          match_score: number | null
          matched_food_name: string | null
          nutrients_json: Json | null
          recipe_id: string
        }
        Insert: {
          created_at?: string
          grams?: number | null
          id?: string
          ingredient_text: string
          match_score?: number | null
          matched_food_name?: string | null
          nutrients_json?: Json | null
          recipe_id: string
        }
        Update: {
          created_at?: string
          grams?: number | null
          id?: string
          ingredient_text?: string
          match_score?: number | null
          matched_food_name?: string | null
          nutrients_json?: Json | null
          recipe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredient_matches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
            foreignKeyName: "kpi_definitions_challenge_id_fkey"
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
            foreignKeyName: "kpi_measurements_kpi_definition_id_fkey"
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          custom_color: string | null
          display_name: string | null
          id: string
          is_approved: boolean | null
          privacy_settings: Json | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          custom_color?: string | null
          display_name?: string | null
          id: string
          is_approved?: boolean | null
          privacy_settings?: Json | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          custom_color?: string | null
          display_name?: string | null
          id?: string
          is_approved?: boolean | null
          privacy_settings?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          name: string
          parent_id: string | null
          sort_order: number | null
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          name: string
          parent_id?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      recipe_favorites: {
        Row: {
          created_at: string
          id: string
          recipe_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipe_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipe_favorites_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          calories_per_serving: number | null
          calories_total: number | null
          cook_time: number | null
          created_at: string
          cuisine: string | null
          difficulty: Database["public"]["Enums"]["recipe_difficulty"] | null
          group_id: string | null
          id: string
          ingredients_json: Json | null
          is_public: boolean | null
          macros_json: Json | null
          micros_json: Json | null
          nutrition_confidence: number | null
          prep_time: number | null
          servings: number
          short_description: string | null
          source: string | null
          steps_json: Json | null
          tags_json: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calories_per_serving?: number | null
          calories_total?: number | null
          cook_time?: number | null
          created_at?: string
          cuisine?: string | null
          difficulty?: Database["public"]["Enums"]["recipe_difficulty"] | null
          group_id?: string | null
          id?: string
          ingredients_json?: Json | null
          is_public?: boolean | null
          macros_json?: Json | null
          micros_json?: Json | null
          nutrition_confidence?: number | null
          prep_time?: number | null
          servings?: number
          short_description?: string | null
          source?: string | null
          steps_json?: Json | null
          tags_json?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calories_per_serving?: number | null
          calories_total?: number | null
          cook_time?: number | null
          created_at?: string
          cuisine?: string | null
          difficulty?: Database["public"]["Enums"]["recipe_difficulty"] | null
          group_id?: string | null
          id?: string
          ingredients_json?: Json | null
          is_public?: boolean | null
          macros_json?: Json | null
          micros_json?: Json | null
          nutrition_confidence?: number | null
          prep_time?: number | null
          servings?: number
          short_description?: string | null
          source?: string | null
          steps_json?: Json | null
          tags_json?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_views: {
        Row: {
          created_at: string | null
          date_range: Json
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_range: Json
          filters: Json
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_range?: Json
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_tips: {
        Row: {
          created_at: string
          dismissed: boolean
          id: string
          show_after: string | null
          tip_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed?: boolean
          id?: string
          show_after?: string | null
          tip_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed?: boolean
          id?: string
          show_after?: string | null
          tip_key?: string
          user_id?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          amount: string | null
          category: string | null
          checked: boolean | null
          created_at: string
          id: string
          ingredient_text: string
          is_checked: boolean
          item_name: string | null
          quantity: number | null
          recipe_id: string | null
          unit: string | null
          user_id: string
        }
        Insert: {
          amount?: string | null
          category?: string | null
          checked?: boolean | null
          created_at?: string
          id?: string
          ingredient_text: string
          is_checked?: boolean
          item_name?: string | null
          quantity?: number | null
          recipe_id?: string | null
          unit?: string | null
          user_id: string
        }
        Update: {
          amount?: string | null
          category?: string | null
          checked?: boolean | null
          created_at?: string
          id?: string
          ingredient_text?: string
          is_checked?: boolean
          item_name?: string | null
          quantity?: number | null
          recipe_id?: string | null
          unit?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      subtasks: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          sort_order: number | null
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number | null
          task_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          sort_order?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      task_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          task_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          task_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          task_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_audit_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_preferences: {
        Row: {
          created_at: string
          default_view: string | null
          id: string
          show_completed: boolean | null
          sort_by: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_view?: string | null
          id?: string
          show_completed?: boolean | null
          sort_by?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_view?: string | null
          id?: string
          show_completed?: boolean | null
          sort_by?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tags_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          due_time: string | null
          effort: string | null
          id: string
          is_archived: boolean
          is_someday: boolean
          priority: string | null
          project_id: string | null
          recurrence: string | null
          reminder_minutes: number | null
          sort_order: number | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          effort?: string | null
          id?: string
          is_archived?: boolean
          is_someday?: boolean
          priority?: string | null
          project_id?: string | null
          recurrence?: string | null
          reminder_minutes?: number | null
          sort_order?: number | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          due_time?: string | null
          effort?: string | null
          id?: string
          is_archived?: boolean
          is_someday?: boolean
          priority?: string | null
          project_id?: string | null
          recurrence?: string | null
          reminder_minutes?: number | null
          sort_order?: number | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_friends: {
        Row: {
          created_at: string
          friend_user_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_user_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_user_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_group_invite_code: { Args: { p_group_id: string }; Returns: string }
      get_popular_challenges_by_duration: {
        Args: { p_end_date: string; p_group_id: string; p_start_date: string }
        Returns: {
          challenge_id: string
          duration_days: number
          id: string
          is_trending: boolean
          participant_count: number
          participants: string[]
          title: string
          total_fails: number
        }[]
      }
      get_server_time: { Args: never; Returns: string }
    }
    Enums: {
      challenge_duration_type: "days" | "weeks" | "months" | "custom"
      challenge_frequency: "daily" | "weekly" | "custom"
      challenge_status: "active" | "completed" | "cancelled"
      challenge_type: "habit" | "kpi"
      group_role: "owner" | "admin" | "member"
      idea_status: "proposed" | "approved" | "rejected" | "implemented"
      payment_type: "penalty" | "reward" | "settlement"
      project_status: "active" | "completed" | "archived" | "on_hold"
      recipe_difficulty: "easy" | "medium" | "hard"
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
      challenge_duration_type: ["days", "weeks", "months", "custom"],
      challenge_frequency: ["daily", "weekly", "custom"],
      challenge_status: ["active", "completed", "cancelled"],
      challenge_type: ["habit", "kpi"],
      group_role: ["owner", "admin", "member"],
      idea_status: ["proposed", "approved", "rejected", "implemented"],
      payment_type: ["penalty", "reward", "settlement"],
      project_status: ["active", "completed", "archived", "on_hold"],
      recipe_difficulty: ["easy", "medium", "hard"],
    },
  },
} as const
