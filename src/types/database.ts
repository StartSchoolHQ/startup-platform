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
          active: boolean | null
          color_theme: string | null
          context: Database["public"]["Enums"]["task_context_type"]
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          points_reward: number | null
          sort_order: number | null
          xp_reward: number | null
        }
        Insert: {
          active?: boolean | null
          color_theme?: string | null
          context?: Database["public"]["Enums"]["task_context_type"]
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          points_reward?: number | null
          sort_order?: number | null
          xp_reward?: number | null
        }
        Update: {
          active?: boolean | null
          color_theme?: string | null
          context?: Database["public"]["Enums"]["task_context_type"]
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          points_reward?: number | null
          sort_order?: number | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      client_meetings: {
        Row: {
          call_type: string | null
          cancelled_at: string | null
          client_name: string
          client_type: string | null
          completed_at: string | null
          created_at: string | null
          how_it_went: string | null
          id: string
          meeting_date: string | null
          new_things_learned: string | null
          responsible_user_id: string
          status: string | null
          team_id: string
          updated_at: string | null
        }
        Insert: {
          call_type?: string | null
          cancelled_at?: string | null
          client_name: string
          client_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          how_it_went?: string | null
          id?: string
          meeting_date?: string | null
          new_things_learned?: string | null
          responsible_user_id: string
          status?: string | null
          team_id: string
          updated_at?: string | null
        }
        Update: {
          call_type?: string | null
          cancelled_at?: string | null
          client_name?: string
          client_type?: string | null
          completed_at?: string | null
          created_at?: string | null
          how_it_went?: string | null
          id?: string
          meeting_date?: string | null
          new_things_learned?: string | null
          responsible_user_id?: string
          status?: string | null
          team_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_meetings_responsible_user_id_fkey1"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_meetings_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "client_meetings_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_streams: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          mrr_amount: number | null
          product_name: string
          started_at: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["revenue_type"]
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          mrr_amount?: number | null
          product_name: string
          started_at?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["revenue_type"]
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          mrr_amount?: number | null
          product_name?: string
          started_at?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["revenue_type"]
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "revenue_streams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "revenue_streams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      task_progress: {
        Row: {
          activity_type: string
          assigned_at: string | null
          assigned_by_user_id: string | null
          assigned_to_user_id: string | null
          cancelled_at: string | null
          completed_at: string | null
          context: Database["public"]["Enums"]["task_context_type"]
          created_at: string
          id: string
          metadata: Json | null
          points_awarded: number | null
          review_feedback: string | null
          reviewer_user_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status_type"]
          submission_data: Json | null
          submission_notes: string | null
          submission_url: string | null
          submitted_at: string | null
          task_id: string
          team_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activity_type: string
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          context: Database["public"]["Enums"]["task_context_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          points_awarded?: number | null
          review_feedback?: string | null
          reviewer_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status_type"]
          submission_data?: Json | null
          submission_notes?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          task_id: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activity_type?: string
          assigned_at?: string | null
          assigned_by_user_id?: string | null
          assigned_to_user_id?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          context?: Database["public"]["Enums"]["task_context_type"]
          created_at?: string
          id?: string
          metadata?: Json | null
          points_awarded?: number | null
          review_feedback?: string | null
          reviewer_user_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status_type"]
          submission_data?: Json | null
          submission_notes?: string | null
          submission_url?: string | null
          submitted_at?: string | null
          task_id?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_progress_reviewer_user_id_fkey_public"
            columns: ["reviewer_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "task_progress_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          achievement_id: string | null
          activity_type: string
          auto_assign_to_new_teams: boolean | null
          base_points_reward: number | null
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
          activity_type?: string
          auto_assign_to_new_teams?: boolean | null
          base_points_reward?: number | null
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
          activity_type?: string
          auto_assign_to_new_teams?: boolean | null
          base_points_reward?: number | null
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
            foreignKeyName: "tasks_achievement_id_fkey1"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      team_achievements: {
        Row: {
          achievement_id: string
          completed_at: string
          created_at: string
          id: string
          points_awarded: number
          team_id: string
          xp_awarded: number
        }
        Insert: {
          achievement_id: string
          completed_at?: string
          created_at?: string
          id?: string
          points_awarded?: number
          team_id: string
          xp_awarded?: number
        }
        Update: {
          achievement_id?: string
          completed_at?: string
          created_at?: string
          id?: string
          points_awarded?: number
          team_id?: string
          xp_awarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_achievements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_achievements_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string | null
          id: string
          invited_by_user_id: string
          invited_user_id: string
          responded_at: string | null
          role: Database["public"]["Enums"]["team_role_type"] | null
          status: string | null
          team_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by_user_id: string
          invited_user_id: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role_type"] | null
          status?: string | null
          team_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by_user_id?: string
          invited_user_id?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["team_role_type"] | null
          status?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_user_id_fkey1"
            columns: ["invited_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_user_id_fkey1"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey1"
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
          joined_at: string | null
          left_at: string | null
          team_id: string
          team_role: Database["public"]["Enums"]["team_role_type"] | null
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          team_id: string
          team_role?: Database["public"]["Enums"]["team_role_type"] | null
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          team_id?: string
          team_role?: Database["public"]["Enums"]["team_role_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_user_id_fkey"
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
          description: string | null
          explained_at: string | null
          explained_by_user_id: string | null
          explanation: string | null
          id: string
          points_penalty: number | null
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
          description?: string | null
          explained_at?: string | null
          explained_by_user_id?: string | null
          explanation?: string | null
          id?: string
          points_penalty?: number | null
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
          description?: string | null
          explained_at?: string | null
          explained_by_user_id?: string | null
          explanation?: string | null
          id?: string
          points_penalty?: number | null
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
            foreignKeyName: "team_strikes_explained_by_user_id_fkey1"
            columns: ["explained_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_resolved_by_user_id_fkey1"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "team_strikes_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_strikes_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          archived_at: string | null
          created_at: string | null
          current_week: number | null
          description: string | null
          formation_cost: number | null
          founder_id: string | null
          id: string
          member_count: number | null
          name: string
          status: Database["public"]["Enums"]["status_state"] | null
          strikes_count: number | null
          team_points: number
          weekly_maintenance_cost: number | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          current_week?: number | null
          description?: string | null
          formation_cost?: number | null
          founder_id?: string | null
          id?: string
          member_count?: number | null
          name: string
          status?: Database["public"]["Enums"]["status_state"] | null
          strikes_count?: number | null
          team_points?: number
          weekly_maintenance_cost?: number | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          current_week?: number | null
          description?: string | null
          formation_cost?: number | null
          founder_id?: string | null
          id?: string
          member_count?: number | null
          name?: string
          status?: Database["public"]["Enums"]["status_state"] | null
          strikes_count?: number | null
          team_points?: number
          weekly_maintenance_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_founder_id_fkey1"
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
          activity_type: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          points_change: number
          points_type: string | null
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
          activity_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points_change?: number
          points_type?: string | null
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
          activity_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points_change?: number
          points_type?: string | null
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
            foreignKeyName: "fk_tx_revenue_stream_id"
            columns: ["revenue_stream_id"]
            isOneToOne: false
            referencedRelation: "revenue_streams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tx_task_id"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_validated_by_user_id_fkey"
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
          id: string
          points_awarded: number | null
          user_id: string
          xp_awarded: number | null
        }
        Insert: {
          achievement_id: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          user_id: string
          xp_awarded?: number | null
        }
        Update: {
          achievement_id?: string
          completed_at?: string | null
          created_at?: string | null
          id?: string
          points_awarded?: number | null
          user_id?: string
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey1"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_task_completions: {
        Row: {
          completion_count: number | null
          id: string
          last_completed_at: string | null
          task_id: string
          total_xp_earned: number | null
          user_id: string
        }
        Insert: {
          completion_count?: number | null
          id?: string
          last_completed_at?: string | null
          task_id: string
          total_xp_earned?: number | null
          user_id: string
        }
        Update: {
          completion_count?: number | null
          id?: string
          last_completed_at?: string | null
          task_id?: string
          total_xp_earned?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_task_completions_user_id_fkey"
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
          created_at: string | null
          daily_validation_xp: number | null
          email: string
          graduation_level: number | null
          id: string
          name: string | null
          primary_role: Database["public"]["Enums"]["primary_role_type"] | null
          status: Database["public"]["Enums"]["status_state"] | null
          total_points: number
          total_xp: number
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          daily_validation_xp?: number | null
          email: string
          graduation_level?: number | null
          id?: string
          name?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role_type"] | null
          status?: Database["public"]["Enums"]["status_state"] | null
          total_points?: number
          total_xp?: number
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          daily_validation_xp?: number | null
          email?: string
          graduation_level?: number | null
          id?: string
          name?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role_type"] | null
          status?: Database["public"]["Enums"]["status_state"] | null
          total_points?: number
          total_xp?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      weekly_reports: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          submission_data: Json | null
          submitted_at: string | null
          team_id: string | null
          updated_at: string | null
          user_id: string
          week_end_date: string
          week_number: number
          week_start_date: string
          week_year: number
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          submission_data?: Json | null
          submitted_at?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id: string
          week_end_date: string
          week_number: number
          week_start_date: string
          week_year: number
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          submission_data?: Json | null
          submitted_at?: string | null
          team_id?: string | null
          updated_at?: string | null
          user_id?: string
          week_end_date?: string
          week_number?: number
          week_start_date?: string
          week_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reports_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "team_total_points"
            referencedColumns: ["team_id"]
          },
          {
            foreignKeyName: "weekly_reports_team_id_fkey1"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reports_user_id_fkey1"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      team_total_points: {
        Row: {
          team_id: string | null
          team_name: string | null
          team_points: number | null
          total_individual_points: number | null
          total_points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_individual_task: {
        Args: {
          p_task_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      assign_team_task_to_progress: {
        Args: {
          p_progress_id: string
          p_user_id: string
          p_team_id: string
          p_task_id: string
          p_assigned_to_user_id?: string
          p_assigned_by_user_id?: string
        }
        Returns: undefined
      }
      complete_individual_task: {
        Args: {
          p_progress_id: string
          p_submission_data?: Json
          p_submission_notes?: string
        }
        Returns: {
          success: boolean
        }[]
      }
      get_team_tasks_from_progress: {
        Args: {
          p_team_id: string
        }
        Returns: {
          progress_id: string | null
          task_id: string
          task_title: string
          task_description: string | null
          category: string | null
          difficulty_level: number | null
          base_xp_reward: number | null
          base_points_reward: number | null
          progress_status: string | null
          assigned_to_user_id: string | null
          assignee_name: string | null
          assignee_avatar_url: string | null
          assigned_at: string | null
          started_at: string | null
          completed_at: string | null
          is_available: boolean | null
          achievement_id: string | null
          achievement_name: string | null
        }[]
      }
      get_team_tasks_visible: {
        Args: {
          p_team_id: string
        }
        Returns: {
          progress_id: string | null
          task_id: string
          task_title: string
          task_description: string | null
          category: string | null
          difficulty_level: number | null
          base_xp_reward: number | null
          base_points_reward: number | null
          progress_status: string | null
          assigned_to_user_id: string | null
          assignee_name: string | null
          assignee_avatar_url: string | null
          assigned_at: string | null
          started_at: string | null
          completed_at: string | null
          is_available: boolean | null
          achievement_id: string | null
          achievement_name: string | null
        }[]
      }
      get_user_individual_tasks: {
        Args: {
          p_user_id: string
        }
        Returns: {
          progress_id: string | null
          task_id: string
          task_title: string
          task_description: string | null
          category: string | null
          difficulty_level: number | null
          base_xp_reward: number | null
          base_points_reward: number | null
          progress_status: string | null
          assigned_to_user_id: string | null
          assignee_name: string | null
          assignee_avatar_url: string | null
          assigned_at: string | null
          started_at: string | null
          completed_at: string | null
          is_available: boolean | null
          achievement_id: string | null
          achievement_name: string | null
        }[]
      }
      get_user_tasks_visible: {
        Args: {
          p_user_id: string
        }
        Returns: {
          progress_id: string | null
          task_id: string
          task_title: string
          task_description: string | null
          category: string | null
          difficulty_level: number | null
          base_xp_reward: number | null
          base_points_reward: number | null
          progress_status: string | null
          assigned_to_user_id: string | null
          assignee_name: string | null
          assignee_avatar_url: string | null
          assigned_at: string | null
          started_at: string | null
          completed_at: string | null
          is_available: boolean | null
          achievement_id: string | null
          achievement_name: string | null
        }[]
      }
      start_individual_task: {
        Args: {
          p_progress_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
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
      task_context_type: "individual" | "team"
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
        | "meeting"
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
    ? DefaultSchema["Tables"][TableName] extends {
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

// Additional type exports
export type User = Tables<"users">
export type Team = Tables<"teams">
export type WeeklyReport = Tables<"weekly_reports">
export type Task = Tables<"tasks">
export type TaskProgress = Tables<"task_progress">
export type Achievement = Tables<"achievements">
export type Transaction = Tables<"transactions">
export type TeamMember = Tables<"team_members">
export type TeamInvitation = Tables<"team_invitations">
export type RevenueStream = Tables<"revenue_streams">
export type ClientMeeting = Tables<"client_meetings">
