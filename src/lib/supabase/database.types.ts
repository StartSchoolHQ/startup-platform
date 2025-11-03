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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          active: boolean
          color_theme: string | null
          created_at: string
          credits_reward: number | null
          description: string | null
          icon: string | null
          id: string
          name: string
          sort_order: number
          xp_reward: number | null
        }
        Insert: {
          active?: boolean
          color_theme?: string | null
          created_at?: string
          credits_reward?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          sort_order?: number
          xp_reward?: number | null
        }
        Update: {
          active?: boolean
          color_theme?: string | null
          created_at?: string
          credits_reward?: number | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          sort_order?: number
          xp_reward?: number | null
        }
        Relationships: []
      }
      revenue_streams: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          mrr_amount: number
          product_name: string
          started_at: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["revenue_type"]
          user_id: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          mrr_amount?: number
          product_name: string
          started_at?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["revenue_type"]
          user_id?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          mrr_amount?: number
          product_name?: string
          started_at?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["revenue_type"]
          user_id?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_revenue_streams_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_revenue_streams_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_revenue_streams_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          achievement_id: string | null
          auto_assign_to_new_teams: boolean | null
          base_credits_reward: number | null
          base_xp_reward: number | null
          category: Database["public"]["Enums"]["task_category_type"] | null
          created_at: string | null
          created_by_user_id: string | null
          deliverables: string[] | null
          description: string | null
          detailed_instructions: string | null
          difficulty_level: number | null
          estimated_hours: number | null
          id: string
          is_active: boolean | null
          learning_objectives: string[] | null
          metadata: Json | null
          minimum_team_level: number | null
          peer_review_criteria: Json | null
          prerequisite_template_codes: string[] | null
          priority: Database["public"]["Enums"]["task_priority_type"] | null
          requires_review: boolean | null
          resources: Json | null
          review_instructions: string | null
          sort_order: number | null
          submission_form_schema: Json | null
          tags: string[] | null
          template_code: string
          tips_content: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          achievement_id?: string | null
          auto_assign_to_new_teams?: boolean | null
          base_credits_reward?: number | null
          base_xp_reward?: number | null
          category?: Database["public"]["Enums"]["task_category_type"] | null
          created_at?: string | null
          created_by_user_id?: string | null
          deliverables?: string[] | null
          description?: string | null
          detailed_instructions?: string | null
          difficulty_level?: number | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          learning_objectives?: string[] | null
          metadata?: Json | null
          minimum_team_level?: number | null
          peer_review_criteria?: Json | null
          prerequisite_template_codes?: string[] | null
          priority?: Database["public"]["Enums"]["task_priority_type"] | null
          requires_review?: boolean | null
          resources?: Json | null
          review_instructions?: string | null
          sort_order?: number | null
          submission_form_schema?: Json | null
          tags?: string[] | null
          template_code: string
          tips_content?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          achievement_id?: string | null
          auto_assign_to_new_teams?: boolean | null
          base_credits_reward?: number | null
          base_xp_reward?: number | null
          category?: Database["public"]["Enums"]["task_category_type"] | null
          created_at?: string | null
          created_by_user_id?: string | null
          deliverables?: string[] | null
          description?: string | null
          detailed_instructions?: string | null
          difficulty_level?: number | null
          estimated_hours?: number | null
          id?: string
          is_active?: boolean | null
          learning_objectives?: string[] | null
          metadata?: Json | null
          minimum_team_level?: number | null
          peer_review_criteria?: Json | null
          prerequisite_template_codes?: string[] | null
          priority?: Database["public"]["Enums"]["task_priority_type"] | null
          requires_review?: boolean | null
          resources?: Json | null
          review_instructions?: string | null
          sort_order?: number | null
          submission_form_schema?: Json | null
          tags?: string[] | null
          template_code?: string
          tips_content?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "global_task_templates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_task_templates_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by_user_id: string
          invited_user_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["team_role_type"]
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by_user_id: string
          invited_user_id: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role_type"]
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by_user_id?: string
          invited_user_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role_type"]
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_by_user_id_fkey"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          joined_at: string
          left_at: string | null
          team_id: string
          team_role: Database["public"]["Enums"]["team_role_type"]
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          left_at?: string | null
          team_id: string
          team_role?: Database["public"]["Enums"]["team_role_type"]
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          left_at?: string | null
          team_id?: string
          team_role?: Database["public"]["Enums"]["team_role_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_team_members_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_team_members_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_team_members_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_strikes: {
        Row: {
          created_at: string | null
          credits_penalty: number | null
          description: string | null
          explained_at: string | null
          explained_by_user_id: string | null
          explanation: string | null
          id: string
          resolved_at: string | null
          resolved_by_user_id: string | null
          status: string | null
          strike_type: string
          team_id: string
          title: string
          updated_at: string | null
          user_id: string | null
          xp_penalty: number | null
        }
        Insert: {
          created_at?: string | null
          credits_penalty?: number | null
          description?: string | null
          explained_at?: string | null
          explained_by_user_id?: string | null
          explanation?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string | null
          strike_type: string
          team_id: string
          title: string
          updated_at?: string | null
          user_id?: string | null
          xp_penalty?: number | null
        }
        Update: {
          created_at?: string | null
          credits_penalty?: number | null
          description?: string | null
          explained_at?: string | null
          explained_by_user_id?: string | null
          explanation?: string | null
          id?: string
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          status?: string | null
          strike_type?: string
          team_id?: string
          title?: string
          updated_at?: string | null
          user_id?: string | null
          xp_penalty?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_strikes_explained_by_user_id_fkey"
            columns: ["explained_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_explained_by_user_id_fkey"
            columns: ["explained_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_task_progress: {
        Row: {
          assigned_at: string | null
          assigned_by_user_id: string | null
          assigned_to_user_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          reviewer_user_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status_type"] | null
          submission_data: Json | null
          submission_notes: string | null
          task_id: string
          team_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reviewer_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status_type"] | null
          submission_data?: Json | null
          submission_notes?: string | null
          task_id: string
          team_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          reviewer_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status_type"] | null
          submission_data?: Json | null
          submission_notes?: string | null
          task_id?: string
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_task_progress_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_assigned_by_user_id_fkey"
            columns: ["assigned_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_reviewer_user_id_fkey"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_task_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          archived_at: string | null
          created_at: string
          current_week: number
          description: string | null
          formation_cost: number
          founder_id: string | null
          id: string
          member_count: number | null
          name: string
          status: Database["public"]["Enums"]["status_state"]
          strikes_count: number | null
          weekly_maintenance_cost: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          current_week?: number
          description?: string | null
          formation_cost?: number
          founder_id?: string | null
          id?: string
          member_count?: number | null
          name: string
          status?: Database["public"]["Enums"]["status_state"]
          strikes_count?: number | null
          weekly_maintenance_cost?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          current_week?: number
          description?: string | null
          formation_cost?: number
          founder_id?: string | null
          id?: string
          member_count?: number | null
          name?: string
          status?: Database["public"]["Enums"]["status_state"]
          strikes_count?: number | null
          weekly_maintenance_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          achievement_id: string | null
          created_at: string
          credits_change: number
          description: string | null
          id: string
          metadata: Json
          revenue_stream_id: string | null
          task_id: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          validated_by_user_id: string | null
          week_number: number | null
          xp_change: number
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string
          credits_change?: number
          description?: string | null
          id?: string
          metadata?: Json
          revenue_stream_id?: string | null
          task_id?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          validated_by_user_id?: string | null
          week_number?: number | null
          xp_change?: number
        }
        Update: {
          achievement_id?: string | null
          created_at?: string
          credits_change?: number
          description?: string | null
          id?: string
          metadata?: Json
          revenue_stream_id?: string | null
          task_id?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          validated_by_user_id?: string | null
          week_number?: number | null
          xp_change?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_tx_achievement_id"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_revenue_stream_id"
            columns: ["revenue_stream_id"]
            isOneToOne: false
            referencedRelation: "revenue_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_team_id"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_validated_by_user_id"
            columns: ["validated_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_validated_by_user_id"
            columns: ["validated_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          completed_at: string | null
          created_at: string | null
          credits_awarded: number | null
          id: string
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          achievement_id: string
          completed_at?: string | null
          created_at?: string | null
          credits_awarded?: number | null
          id?: string
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          achievement_id?: string
          completed_at?: string | null
          created_at?: string | null
          credits_awarded?: number | null
          id?: string
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_completions: {
        Row: {
          completion_count: number
          id: string
          last_completed_at: string | null
          task_id: string
          total_xp_earned: number
          user_id: string
        }
        Insert: {
          completion_count?: number
          id?: string
          last_completed_at?: string | null
          task_id: string
          total_xp_earned?: number
          user_id: string
        }
        Update: {
          completion_count?: number
          id?: string
          last_completed_at?: string | null
          task_id?: string
          total_xp_earned?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_utc_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_utc_user_id"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          daily_validation_xp: number
          email: string
          graduation_level: number | null
          id: string
          name: string | null
          primary_role: Database["public"]["Enums"]["primary_role_type"]
          status: Database["public"]["Enums"]["status_state"]
          total_credits: number
          total_xp: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          daily_validation_xp?: number
          email: string
          graduation_level?: number | null
          id?: string
          name?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role_type"]
          status?: Database["public"]["Enums"]["status_state"]
          total_credits?: number
          total_xp?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          daily_validation_xp?: number
          email?: string
          graduation_level?: number | null
          id?: string
          name?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role_type"]
          status?: Database["public"]["Enums"]["status_state"]
          total_credits?: number
          total_xp?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          created_at: string | null
          id: string
          submission_data: Json
          submitted_at: string
          team_id: string
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_number: number
          week_start_date: string
          week_year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          submission_data?: Json
          submitted_at?: string
          team_id: string
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_number: number
          week_start_date: string
          week_year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          submission_data?: Json
          submitted_at?: string
          team_id?: string
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_number?: number
          week_start_date?: string
          week_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      user_progress: {
        Row: {
          daily_validation_xp: number | null
          graduation_level: number | null
          id: string | null
          name: string | null
          status: Database["public"]["Enums"]["status_state"] | null
          total_credits: number | null
          total_xp: number | null
        }
        Insert: {
          daily_validation_xp?: number | null
          graduation_level?: number | null
          id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["status_state"] | null
          total_credits?: number | null
          total_xp?: number | null
        }
        Update: {
          daily_validation_xp?: number | null
          graduation_level?: number | null
          id?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["status_state"] | null
          total_credits?: number | null
          total_xp?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_external_task_for_review: {
        Args: { p_progress_id: string }
        Returns: Json
      }
      accept_task_for_review: { Args: { p_task_id: string }; Returns: Json }
      assign_strikes_for_missed_reports: { Args: never; Returns: number }
      assign_tasks_to_new_team: {
        Args: { team_id_param: string }
        Returns: undefined
      }
      assign_team_task: {
        Args: {
          p_assigned_by_user_id?: string
          p_assigned_to_user_id: string
          p_task_id: string
        }
        Returns: Json
      }
      assign_templates_to_team: {
        Args: {
          p_assigned_by_user_id?: string
          p_team_id: string
          p_template_ids?: string[]
        }
        Returns: Json
      }
      assign_user_to_task_simple: {
        Args: {
          p_assigned_by_user_id?: string
          p_progress_id: string
          p_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      assign_user_to_template_task: {
        Args: {
          p_assigned_by_user_id?: string
          p_task_id: string
          p_user_id: string
        }
        Returns: Json
      }
      check_and_award_achievement: {
        Args: { p_achievement_id: string; p_user_id: string }
        Returns: Json
      }
      check_missed_weekly_reports: {
        Args: never
        Returns: {
          missed_weeks: number
          team_id: string
        }[]
      }
      create_global_task_template: {
        Args: {
          p_auto_assign_to_new_teams?: boolean
          p_base_credits_reward?: number
          p_base_xp_reward?: number
          p_category?: Database["public"]["Enums"]["task_category_type"]
          p_description?: string
          p_difficulty_level?: number
          p_estimated_hours?: number
          p_prerequisite_template_codes?: string[]
          p_priority?: Database["public"]["Enums"]["task_priority_type"]
          p_requires_review?: boolean
          p_review_instructions?: string
          p_sort_order?: number
          p_submission_form_schema?: Json
          p_template_code: string
          p_title: string
        }
        Returns: Json
      }
      create_team_task: {
        Args: {
          p_category?: string
          p_created_by_user_id?: string
          p_credits_reward?: number
          p_description?: string
          p_difficulty_level?: number
          p_estimated_hours?: number
          p_priority?: Database["public"]["Enums"]["task_priority_type"]
          p_requires_review?: boolean
          p_team_id: string
          p_title: string
          p_xp_reward?: number
        }
        Returns: Json
      }
      decrement_team_member_count: {
        Args: { team_id: string }
        Returns: undefined
      }
      disband_all_team_members: {
        Args: { team_id_param: string }
        Returns: undefined
      }
      get_available_templates_for_team: {
        Args: { p_team_id: string }
        Returns: {
          category: Database["public"]["Enums"]["task_category_type"]
          credits_reward: number
          description: string
          difficulty_level: number
          estimated_hours: number
          is_assigned: boolean
          prerequisites_met: boolean
          priority: Database["public"]["Enums"]["task_priority_type"]
          sort_order: number
          task_status: Database["public"]["Enums"]["task_status_type"]
          template_code: string
          template_id: string
          title: string
          xp_reward: number
        }[]
      }
      get_enhanced_team_tasks: {
        Args: { p_team_id: string }
        Returns: {
          assigned_at: string
          assigned_to_user_id: string
          assignee_avatar_url: string
          assignee_name: string
          category: string
          completed_at: string
          created_at: string
          credits_reward: number
          description: string
          difficulty_level: number
          estimated_hours: number
          is_available: boolean
          prerequisites_met: boolean
          priority: Database["public"]["Enums"]["task_priority_type"]
          requires_review: boolean
          review_instructions: string
          sort_order: number
          started_at: string
          status: Database["public"]["Enums"]["task_status_type"]
          task_id: string
          template_code: string
          template_id: string
          title: string
          updated_at: string
          xp_reward: number
        }[]
      }
      get_riga_week_boundaries: {
        Args: { input_date?: string }
        Returns: {
          week_end: string
          week_number: number
          week_start: string
          week_year: number
        }[]
      }
      get_task_for_review: { Args: { p_task_id: string }; Returns: Json }
      get_task_history: {
        Args: { p_progress_id: string }
        Returns: {
          description: string
          event_timestamp: string
          event_type: string
          id: string
          metadata: Json
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_tasks_available_for_review: {
        Args: { p_team_id?: string }
        Returns: {
          assignee_name: string
          credits_reward: number
          description: string
          priority: Database["public"]["Enums"]["task_priority_type"]
          submission_preview: Json
          submitted_at: string
          task_id: string
          team_id: string
          team_name: string
          title: string
          xp_reward: number
        }[]
      }
      get_tasks_by_achievement: {
        Args: { p_achievement_id?: string; p_team_id?: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          assigned_at: string
          assigned_to_user_id: string
          assignee_avatar_url: string
          assignee_name: string
          base_credits_reward: number
          base_xp_reward: number
          category: string
          completed_at: string
          description: string
          difficulty_level: number
          is_available: boolean
          progress_id: string
          started_at: string
          status: string
          task_id: string
          title: string
        }[]
      }
      get_team_strikes: {
        Args: { p_team_id: string }
        Returns: {
          created_at: string
          explanation: string
          id: string
          reason: string
          strike_date: string
          team_id: string
        }[]
      }
      get_team_tasks: {
        Args: { p_team_id: string }
        Returns: {
          assigned_at: string
          assigned_by: Json
          assigned_to: Json
          category: string
          completed_at: string
          created_at: string
          credits_reward: number
          description: string
          difficulty_level: number
          estimated_hours: number
          id: string
          priority: Database["public"]["Enums"]["task_priority_type"]
          requires_review: boolean
          started_at: string
          status: Database["public"]["Enums"]["task_status_type"]
          title: string
          updated_at: string
          xp_reward: number
        }[]
      }
      get_team_tasks_enhanced: {
        Args: { p_team_id: string }
        Returns: {
          assigned_at: string
          assigned_to_user_id: string
          assignee_name: string
          category: string
          description: string
          is_available: boolean
          prerequisites_met: boolean
          priority: Database["public"]["Enums"]["task_priority_type"]
          requires_review: boolean
          sort_order: number
          status: Database["public"]["Enums"]["task_status_type"]
          task_id: string
          template_code: string
          title: string
          xp_reward: number
        }[]
      }
      get_team_tasks_simple: {
        Args: { p_team_id: string }
        Returns: {
          assigned_at: string
          assigned_to_user_id: string
          assignee_avatar_url: string
          assignee_name: string
          base_xp_reward: number
          category: Database["public"]["Enums"]["task_category_type"]
          completed_at: string
          deliverables: string[]
          description: string
          detailed_instructions: string
          difficulty_level: number
          is_available: boolean
          learning_objectives: string[]
          peer_review_criteria: Json
          priority: Database["public"]["Enums"]["task_priority_type"]
          progress_id: string
          resources: Json
          started_at: string
          status: Database["public"]["Enums"]["task_status_type"]
          task_id: string
          tips_content: Json
          title: string
        }[]
      }
      get_team_tasks_with_availability: {
        Args: { p_team_id: string }
        Returns: {
          assigned_at: string
          assigned_to_user_id: string
          assignee_avatar_url: string
          assignee_name: string
          category: string
          completed_at: string
          created_at: string
          credits_reward: number
          description: string
          difficulty_level: number
          estimated_hours: number
          is_available: boolean
          prerequisites_met: boolean
          priority: Database["public"]["Enums"]["task_priority_type"]
          requires_review: boolean
          review_instructions: string
          sort_order: number
          started_at: string
          status: Database["public"]["Enums"]["task_status_type"]
          task_id: string
          template_code: string
          template_id: string
          title: string
          updated_at: string
          xp_reward: number
        }[]
      }
      get_team_weekly_status: {
        Args: { p_team_id: string }
        Returns: {
          has_submitted: boolean
          submitted_at: string
          user_avatar_url: string
          user_email: string
          user_id: string
          user_name: string
        }[]
      }
      get_user_achievement_progress: {
        Args: { p_user_id: string }
        Returns: {
          achievement_description: string
          achievement_icon: string
          achievement_id: string
          achievement_name: string
          color_theme: string
          completed_tasks: number
          credits_reward: number
          is_completed: boolean
          sort_order: number
          status: string
          total_tasks: number
          xp_reward: number
        }[]
      }
      get_user_tasks_with_feedback: {
        Args: { p_user_id: string }
        Returns: {
          assigned_at: string
          base_credits_reward: number
          base_xp_reward: number
          completed_at: string
          description: string
          difficulty_level: number
          peer_review_feedback: string
          progress_id: string
          reviewer_avatar_url: string
          reviewer_name: string
          status: Database["public"]["Enums"]["task_status_type"]
          team_name: string
          title: string
        }[]
      }
      has_user_submitted_this_week: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      increment_team_member_count: {
        Args: { team_id: string }
        Returns: undefined
      }
      reassign_task: {
        Args: {
          p_new_user_id: string
          p_progress_id: string
          p_reassigned_by_user_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      retry_rejected_task: { Args: { p_task_id: string }; Returns: Json }
      start_task: { Args: { p_task_id: string }; Returns: Json }
      submit_external_peer_review: {
        Args: { p_decision: string; p_feedback?: string; p_progress_id: string }
        Returns: Json
      }
      submit_peer_review: {
        Args: {
          p_completeness_score?: number
          p_decision: string
          p_feedback?: string
          p_overall_score?: number
          p_quality_score?: number
          p_review_data?: Json
          p_task_id: string
        }
        Returns: Json
      }
      submit_strike_explanation: {
        Args: { p_explanation: string; p_strike_id: string }
        Returns: boolean
      }
      submit_task_for_review: {
        Args: {
          p_submission_data: Json
          p_submission_notes?: string
          p_task_id: string
          p_time_spent_hours?: number
        }
        Returns: Json
      }
      update_task_status: {
        Args: {
          p_progress_id: string
          p_status: Database["public"]["Enums"]["task_status_type"]
          p_submission_data?: Json
          p_submission_notes?: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      update_team_task_status: {
        Args: {
          p_changed_by_user_id?: string
          p_new_status: Database["public"]["Enums"]["task_status_type"]
          p_task_id: string
        }
        Returns: Json
      }
      user_can_manage_task: {
        Args: { p_action: string; p_progress_id: string; p_user_id: string }
        Returns: {
          can_manage: boolean
          is_assigned_user: boolean
          user_role: string
        }[]
      }
    }
    Enums: {
      peer_review_status_type:
        | "pending_assignment"
        | "assigned"
        | "in_review"
        | "completed"
        | "cancelled"
      primary_role_type: "user" | "admin"
      revenue_type: "recurring" | "one_time"
      status_state: "active" | "archived"
      task_category_type:
        | "onboarding"
        | "development"
        | "design"
        | "marketing"
        | "business"
        | "testing"
        | "deployment"
        | "milestone"
      task_history_action_type:
        | "created"
        | "assigned"
        | "unassigned"
        | "status_changed"
        | "updated"
        | "deleted"
      task_priority_type: "low" | "medium" | "high" | "urgent"
      task_status_type:
        | "not_started"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "pending_review"
        | "approved"
        | "rejected"
        | "revision_required"
      team_role_type: "member" | "leader" | "founder" | "co_founder"
      transaction_type:
        | "task"
        | "revenue"
        | "validation"
        | "team_cost"
        | "achievement"
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
      peer_review_status_type: [
        "pending_assignment",
        "assigned",
        "in_review",
        "completed",
        "cancelled",
      ],
      primary_role_type: ["user", "admin"],
      revenue_type: ["recurring", "one_time"],
      status_state: ["active", "archived"],
      task_category_type: [
        "onboarding",
        "development",
        "design",
        "marketing",
        "business",
        "testing",
        "deployment",
        "milestone",
      ],
      task_history_action_type: [
        "created",
        "assigned",
        "unassigned",
        "status_changed",
        "updated",
        "deleted",
      ],
      task_priority_type: ["low", "medium", "high", "urgent"],
      task_status_type: [
        "not_started",
        "in_progress",
        "completed",
        "cancelled",
        "pending_review",
        "approved",
        "rejected",
        "revision_required",
      ],
      team_role_type: ["member", "leader", "founder", "co_founder"],
      transaction_type: [
        "task",
        "revenue",
        "validation",
        "team_cost",
        "achievement",
      ],
    },
  },
} as const