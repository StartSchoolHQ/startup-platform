export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      achievements: {
        Row: {
          active: boolean | null;
          color_theme: string | null;
          context: Database["public"]["Enums"]["task_context_type"];
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          points_reward: number | null;
          sort_order: number | null;
          xp_reward: number | null;
        };
        Insert: {
          active?: boolean | null;
          color_theme?: string | null;
          context?: Database["public"]["Enums"]["task_context_type"];
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          points_reward?: number | null;
          sort_order?: number | null;
          xp_reward?: number | null;
        };
        Update: {
          active?: boolean | null;
          color_theme?: string | null;
          context?: Database["public"]["Enums"]["task_context_type"];
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          points_reward?: number | null;
          sort_order?: number | null;
          xp_reward?: number | null;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          changed_by_user_id: string | null;
          changed_fields: string[] | null;
          created_at: string;
          id: string;
          new_data: Json | null;
          old_data: Json | null;
          record_id: string;
          table_name: string;
        };
        Insert: {
          action: string;
          changed_by_user_id?: string | null;
          changed_fields?: string[] | null;
          created_at?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          record_id: string;
          table_name: string;
        };
        Update: {
          action?: string;
          changed_by_user_id?: string | null;
          changed_fields?: string[] | null;
          created_at?: string;
          id?: string;
          new_data?: Json | null;
          old_data?: Json | null;
          record_id?: string;
          table_name?: string;
        };
        Relationships: [];
      };
      client_meetings: {
        Row: {
          call_type: string | null;
          cancelled_at: string | null;
          client_name: string;
          client_type: string | null;
          completed_at: string | null;
          created_at: string | null;
          deleted_at: string | null;
          how_it_went: string | null;
          id: string;
          meeting_data: Json | null;
          meeting_date: string | null;
          new_things_learned: string | null;
          responsible_user_id: string;
          status: string | null;
          team_id: string;
          updated_at: string | null;
        };
        Insert: {
          call_type?: string | null;
          cancelled_at?: string | null;
          client_name: string;
          client_type?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          how_it_went?: string | null;
          id?: string;
          meeting_data?: Json | null;
          meeting_date?: string | null;
          new_things_learned?: string | null;
          responsible_user_id: string;
          status?: string | null;
          team_id: string;
          updated_at?: string | null;
        };
        Update: {
          call_type?: string | null;
          cancelled_at?: string | null;
          client_name?: string;
          client_type?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          how_it_went?: string | null;
          id?: string;
          meeting_data?: Json | null;
          meeting_date?: string | null;
          new_things_learned?: string | null;
          responsible_user_id?: string;
          status?: string | null;
          team_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_meetings_responsible_user_id_fkey1";
            columns: ["responsible_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_meetings_team_id_fkey1";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      leaderboard_snapshots: {
        Row: {
          achievements_count: number;
          created_at: string | null;
          id: string;
          rank_position: number | null;
          tasks_completed: number;
          total_points: number;
          total_xp: number;
          user_id: string;
          week_number: number;
          week_year: number;
        };
        Insert: {
          achievements_count?: number;
          created_at?: string | null;
          id?: string;
          rank_position?: number | null;
          tasks_completed?: number;
          total_points?: number;
          total_xp?: number;
          user_id: string;
          week_number: number;
          week_year: number;
        };
        Update: {
          achievements_count?: number;
          created_at?: string | null;
          id?: string;
          rank_position?: number | null;
          tasks_completed?: number;
          total_points?: number;
          total_xp?: number;
          user_id?: string;
          week_number?: number;
          week_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "leaderboard_snapshots_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          data: Json | null;
          id: string;
          message: string | null;
          read_at: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          message?: string | null;
          read_at?: string | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          data?: Json | null;
          id?: string;
          message?: string | null;
          read_at?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      revenue_streams: {
        Row: {
          created_at: string | null;
          ended_at: string | null;
          id: string;
          mrr_amount: number | null;
          product_name: string;
          started_at: string | null;
          team_id: string | null;
          type: Database["public"]["Enums"]["revenue_type"];
          user_id: string | null;
          verified: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          ended_at?: string | null;
          id?: string;
          mrr_amount?: number | null;
          product_name: string;
          started_at?: string | null;
          team_id?: string | null;
          type: Database["public"]["Enums"]["revenue_type"];
          user_id?: string | null;
          verified?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          ended_at?: string | null;
          id?: string;
          mrr_amount?: number | null;
          product_name?: string;
          started_at?: string | null;
          team_id?: string | null;
          type?: Database["public"]["Enums"]["revenue_type"];
          user_id?: string | null;
          verified?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "revenue_streams_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "revenue_streams_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      support_rate_limits: {
        Row: {
          created_at: string;
          last_submission_at: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          last_submission_at?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          last_submission_at?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      task_edit_suggestions: {
        Row: {
          created_at: string;
          id: string;
          status: string;
          suggestion_text: string;
          task_id: string;
          task_title: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: string;
          suggestion_text: string;
          task_id: string;
          task_title: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: string;
          suggestion_text?: string;
          task_id?: string;
          task_title?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "task_edit_suggestions_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_edit_suggestions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      task_progress: {
        Row: {
          activity_type: string;
          assigned_at: string | null;
          assigned_by_user_id: string | null;
          assigned_to_user_id: string | null;
          cancelled_at: string | null;
          completed_at: string | null;
          context: Database["public"]["Enums"]["task_context_type"];
          created_at: string;
          id: string;
          last_completed_at: string | null;
          metadata: Json | null;
          next_available_at: string | null;
          peer_review_history: Json | null;
          points_awarded: number | null;
          review_feedback: string | null;
          reviewer_user_id: string | null;
          started_at: string | null;
          status: Database["public"]["Enums"]["task_status_type"];
          submission_data: Json | null;
          submission_history: Json | null;
          submission_notes: string | null;
          submission_url: string | null;
          submitted_at: string | null;
          task_id: string;
          team_id: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          activity_type: string;
          assigned_at?: string | null;
          assigned_by_user_id?: string | null;
          assigned_to_user_id?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          context: Database["public"]["Enums"]["task_context_type"];
          created_at?: string;
          id?: string;
          last_completed_at?: string | null;
          metadata?: Json | null;
          next_available_at?: string | null;
          peer_review_history?: Json | null;
          points_awarded?: number | null;
          review_feedback?: string | null;
          reviewer_user_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["task_status_type"];
          submission_data?: Json | null;
          submission_history?: Json | null;
          submission_notes?: string | null;
          submission_url?: string | null;
          submitted_at?: string | null;
          task_id: string;
          team_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          activity_type?: string;
          assigned_at?: string | null;
          assigned_by_user_id?: string | null;
          assigned_to_user_id?: string | null;
          cancelled_at?: string | null;
          completed_at?: string | null;
          context?: Database["public"]["Enums"]["task_context_type"];
          created_at?: string;
          id?: string;
          last_completed_at?: string | null;
          metadata?: Json | null;
          next_available_at?: string | null;
          peer_review_history?: Json | null;
          points_awarded?: number | null;
          review_feedback?: string | null;
          reviewer_user_id?: string | null;
          started_at?: string | null;
          status?: Database["public"]["Enums"]["task_status_type"];
          submission_data?: Json | null;
          submission_history?: Json | null;
          submission_notes?: string | null;
          submission_url?: string | null;
          submitted_at?: string | null;
          task_id?: string;
          team_id?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "task_progress_reviewer_user_id_fkey_public";
            columns: ["reviewer_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_progress_task_id_fkey";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "task_progress_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      tasks: {
        Row: {
          achievement_id: string | null;
          activity_type: string;
          base_points_reward: number | null;
          base_xp_reward: number | null;
          category: Database["public"]["Enums"]["task_category_type"] | null;
          cooldown_days: number | null;
          created_at: string | null;
          created_by_user_id: string | null;
          deliverables: string[] | null;
          description: string | null;
          detailed_instructions: string | null;
          difficulty_level: number | null;
          estimated_hours: number | null;
          id: string;
          is_active: boolean | null;
          is_confidential: boolean | null;
          is_recurring: boolean | null;
          learning_objectives: string[] | null;
          metadata: Json | null;
          minimum_team_level: number | null;
          peer_review_criteria: Json | null;
          prerequisite_template_codes: string[] | null;
          priority: Database["public"]["Enums"]["task_priority_type"] | null;
          recurring_type: string | null;
          requires_review: boolean | null;
          resources: Json | null;
          review_instructions: string | null;
          sort_order: number | null;
          submission_form_schema: Json | null;
          tags: string[] | null;
          template_code: string;
          tips_content: Json | null;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          achievement_id?: string | null;
          activity_type?: string;
          base_points_reward?: number | null;
          base_xp_reward?: number | null;
          category?: Database["public"]["Enums"]["task_category_type"] | null;
          cooldown_days?: number | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          deliverables?: string[] | null;
          description?: string | null;
          detailed_instructions?: string | null;
          difficulty_level?: number | null;
          estimated_hours?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_confidential?: boolean | null;
          is_recurring?: boolean | null;
          learning_objectives?: string[] | null;
          metadata?: Json | null;
          minimum_team_level?: number | null;
          peer_review_criteria?: Json | null;
          prerequisite_template_codes?: string[] | null;
          priority?: Database["public"]["Enums"]["task_priority_type"] | null;
          recurring_type?: string | null;
          requires_review?: boolean | null;
          resources?: Json | null;
          review_instructions?: string | null;
          sort_order?: number | null;
          submission_form_schema?: Json | null;
          tags?: string[] | null;
          template_code: string;
          tips_content?: Json | null;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          achievement_id?: string | null;
          activity_type?: string;
          base_points_reward?: number | null;
          base_xp_reward?: number | null;
          category?: Database["public"]["Enums"]["task_category_type"] | null;
          cooldown_days?: number | null;
          created_at?: string | null;
          created_by_user_id?: string | null;
          deliverables?: string[] | null;
          description?: string | null;
          detailed_instructions?: string | null;
          difficulty_level?: number | null;
          estimated_hours?: number | null;
          id?: string;
          is_active?: boolean | null;
          is_confidential?: boolean | null;
          is_recurring?: boolean | null;
          learning_objectives?: string[] | null;
          metadata?: Json | null;
          minimum_team_level?: number | null;
          peer_review_criteria?: Json | null;
          prerequisite_template_codes?: string[] | null;
          priority?: Database["public"]["Enums"]["task_priority_type"] | null;
          recurring_type?: string | null;
          requires_review?: boolean | null;
          resources?: Json | null;
          review_instructions?: string | null;
          sort_order?: number | null;
          submission_form_schema?: Json | null;
          tags?: string[] | null;
          template_code?: string;
          tips_content?: Json | null;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tasks_achievement_id_fkey1";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tasks_created_by_user_id_fkey";
            columns: ["created_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team_achievements: {
        Row: {
          achievement_id: string;
          completed_at: string;
          created_at: string;
          id: string;
          points_awarded: number;
          team_id: string;
          xp_awarded: number;
        };
        Insert: {
          achievement_id: string;
          completed_at?: string;
          created_at?: string;
          id?: string;
          points_awarded?: number;
          team_id: string;
          xp_awarded?: number;
        };
        Update: {
          achievement_id?: string;
          completed_at?: string;
          created_at?: string;
          id?: string;
          points_awarded?: number;
          team_id?: string;
          xp_awarded?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_achievements_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invitations: {
        Row: {
          created_at: string | null;
          id: string;
          invited_by_user_id: string;
          invited_user_id: string;
          responded_at: string | null;
          role: Database["public"]["Enums"]["team_role_type"] | null;
          status: string | null;
          team_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          invited_by_user_id: string;
          invited_user_id: string;
          responded_at?: string | null;
          role?: Database["public"]["Enums"]["team_role_type"] | null;
          status?: string | null;
          team_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          invited_by_user_id?: string;
          invited_user_id?: string;
          responded_at?: string | null;
          role?: Database["public"]["Enums"]["team_role_type"] | null;
          status?: string | null;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_user_id_fkey1";
            columns: ["invited_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_invited_user_id_fkey1";
            columns: ["invited_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey1";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_leaderboard_snapshots: {
        Row: {
          created_at: string | null;
          id: string;
          meetings_count: number;
          member_count: number;
          rank_position: number | null;
          tasks_completed: number;
          team_id: string;
          total_points: number;
          total_xp: number;
          week_number: number;
          week_year: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          meetings_count?: number;
          member_count?: number;
          rank_position?: number | null;
          tasks_completed?: number;
          team_id: string;
          total_points?: number;
          total_xp?: number;
          week_number: number;
          week_year: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          meetings_count?: number;
          member_count?: number;
          rank_position?: number | null;
          tasks_completed?: number;
          team_id?: string;
          total_points?: number;
          total_xp?: number;
          week_number?: number;
          week_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "team_leaderboard_snapshots_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      team_members: {
        Row: {
          id: string;
          joined_at: string | null;
          left_at: string | null;
          team_id: string;
          team_role: Database["public"]["Enums"]["team_role_type"] | null;
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string | null;
          left_at?: string | null;
          team_id: string;
          team_role?: Database["public"]["Enums"]["team_role_type"] | null;
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string | null;
          left_at?: string | null;
          team_id?: string;
          team_role?: Database["public"]["Enums"]["team_role_type"] | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      team_strikes: {
        Row: {
          created_at: string | null;
          description: string | null;
          explained_at: string | null;
          explained_by_user_id: string | null;
          explanation: string | null;
          id: string;
          points_penalty: number | null;
          resolved_at: string | null;
          resolved_by_user_id: string | null;
          status: string | null;
          strike_type: string;
          team_id: string;
          title: string;
          updated_at: string | null;
          user_id: string | null;
          xp_penalty: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          explained_at?: string | null;
          explained_by_user_id?: string | null;
          explanation?: string | null;
          id?: string;
          points_penalty?: number | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          status?: string | null;
          strike_type: string;
          team_id: string;
          title: string;
          updated_at?: string | null;
          user_id?: string | null;
          xp_penalty?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          explained_at?: string | null;
          explained_by_user_id?: string | null;
          explanation?: string | null;
          id?: string;
          points_penalty?: number | null;
          resolved_at?: string | null;
          resolved_by_user_id?: string | null;
          status?: string | null;
          strike_type?: string;
          team_id?: string;
          title?: string;
          updated_at?: string | null;
          user_id?: string | null;
          xp_penalty?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_strikes_explained_by_user_id_fkey1";
            columns: ["explained_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_strikes_resolved_by_user_id_fkey1";
            columns: ["resolved_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_strikes_team_id_fkey1";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_strikes_user_id_fkey1";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      teams: {
        Row: {
          archived_at: string | null;
          created_at: string | null;
          current_week: number | null;
          description: string | null;
          formation_cost: number | null;
          founder_id: string | null;
          id: string;
          logo_url: string | null;
          member_count: number | null;
          name: string;
          status: Database["public"]["Enums"]["status_state"] | null;
          strikes_count: number | null;
          team_points: number;
          website: string | null;
          weekly_maintenance_cost: number | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string | null;
          current_week?: number | null;
          description?: string | null;
          formation_cost?: number | null;
          founder_id?: string | null;
          id?: string;
          logo_url?: string | null;
          member_count?: number | null;
          name: string;
          status?: Database["public"]["Enums"]["status_state"] | null;
          strikes_count?: number | null;
          team_points?: number;
          website?: string | null;
          weekly_maintenance_cost?: number | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string | null;
          current_week?: number | null;
          description?: string | null;
          formation_cost?: number | null;
          founder_id?: string | null;
          id?: string;
          logo_url?: string | null;
          member_count?: number | null;
          name?: string;
          status?: Database["public"]["Enums"]["status_state"] | null;
          strikes_count?: number | null;
          team_points?: number;
          website?: string | null;
          weekly_maintenance_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_founder_id_fkey1";
            columns: ["founder_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      transactions: {
        Row: {
          achievement_id: string | null;
          activity_type: string;
          created_at: string | null;
          description: string | null;
          id: string;
          metadata: Json | null;
          points_change: number;
          points_type: string | null;
          revenue_stream_id: string | null;
          task_id: string | null;
          team_id: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
          validated_by_user_id: string | null;
          week_number: number | null;
          week_year: number | null;
          xp_change: number;
        };
        Insert: {
          achievement_id?: string | null;
          activity_type: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          points_change?: number;
          points_type?: string | null;
          revenue_stream_id?: string | null;
          task_id?: string | null;
          team_id?: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
          validated_by_user_id?: string | null;
          week_number?: number | null;
          week_year?: number | null;
          xp_change?: number;
        };
        Update: {
          achievement_id?: string | null;
          activity_type?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          metadata?: Json | null;
          points_change?: number;
          points_type?: string | null;
          revenue_stream_id?: string | null;
          task_id?: string | null;
          team_id?: string | null;
          type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
          validated_by_user_id?: string | null;
          week_number?: number | null;
          week_year?: number | null;
          xp_change?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_tx_revenue_stream_id";
            columns: ["revenue_stream_id"];
            isOneToOne: false;
            referencedRelation: "revenue_streams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_tx_task_id";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_validated_by_user_id_fkey";
            columns: ["validated_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_achievements: {
        Row: {
          achievement_id: string;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          points_awarded: number | null;
          user_id: string;
          xp_awarded: number | null;
        };
        Insert: {
          achievement_id: string;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          points_awarded?: number | null;
          user_id: string;
          xp_awarded?: number | null;
        };
        Update: {
          achievement_id?: string;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          points_awarded?: number | null;
          user_id?: string;
          xp_awarded?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey1";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey1";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string | null;
          daily_validation_xp: number | null;
          email: string;
          graduation_level: number | null;
          id: string;
          invited_by: string | null;
          name: string | null;
          primary_role: Database["public"]["Enums"]["primary_role_type"] | null;
          status: Database["public"]["Enums"]["status_state"] | null;
          total_points: number;
          total_xp: number;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string | null;
          daily_validation_xp?: number | null;
          email: string;
          graduation_level?: number | null;
          id?: string;
          invited_by?: string | null;
          name?: string | null;
          primary_role?:
            | Database["public"]["Enums"]["primary_role_type"]
            | null;
          status?: Database["public"]["Enums"]["status_state"] | null;
          total_points?: number;
          total_xp?: number;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string | null;
          daily_validation_xp?: number | null;
          email?: string;
          graduation_level?: number | null;
          id?: string;
          invited_by?: string | null;
          name?: string | null;
          primary_role?:
            | Database["public"]["Enums"]["primary_role_type"]
            | null;
          status?: Database["public"]["Enums"]["status_state"] | null;
          total_points?: number;
          total_xp?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      weekly_reports: {
        Row: {
          context: string | null;
          created_at: string | null;
          id: string;
          status: string | null;
          submission_data: Json | null;
          submitted_at: string | null;
          team_id: string | null;
          updated_at: string | null;
          user_id: string;
          week_end_date: string;
          week_number: number;
          week_start_date: string;
          week_year: number;
        };
        Insert: {
          context?: string | null;
          created_at?: string | null;
          id?: string;
          status?: string | null;
          submission_data?: Json | null;
          submitted_at?: string | null;
          team_id?: string | null;
          updated_at?: string | null;
          user_id: string;
          week_end_date: string;
          week_number: number;
          week_start_date: string;
          week_year: number;
        };
        Update: {
          context?: string | null;
          created_at?: string | null;
          id?: string;
          status?: string | null;
          submission_data?: Json | null;
          submitted_at?: string | null;
          team_id?: string | null;
          updated_at?: string | null;
          user_id?: string;
          week_end_date?: string;
          week_number?: number;
          week_start_date?: string;
          week_year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_reports_team_id_fkey1";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_reports_user_id_fkey1";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      accept_external_task_for_review: {
        Args: { p_progress_id: string };
        Returns: Json;
      };
      add_client_meeting: {
        Args: {
          p_call_type: string;
          p_client_name: string;
          p_client_type: string;
          p_how_it_went: string;
          p_new_things_learned: string;
          p_responsible_user_id: string;
          p_team_id: string;
        };
        Returns: string;
      };
      add_peer_review_history_entry: {
        Args: {
          p_decision?: string;
          p_event_type: string;
          p_feedback?: string;
          p_progress_id: string;
          p_reviewer_id?: string;
        };
        Returns: boolean;
      };
      assign_individual_task: {
        Args: { p_task_id: string; p_user_id: string };
        Returns: Json;
      };
      assign_tasks_to_new_team: {
        Args: { team_id_param: string };
        Returns: undefined;
      };
      assign_team_task_to_progress: {
        Args: {
          p_assigned_by_user_id?: string;
          p_assigned_to_user_id?: string;
          p_task_id: string;
          p_team_id: string;
        };
        Returns: Json;
      };
      assign_user_to_task_simple: {
        Args: {
          p_assigned_by_user_id?: string;
          p_progress_id: string;
          p_user_id: string;
        };
        Returns: {
          message: string;
          success: boolean;
        }[];
      };
      assign_user_to_template_task: {
        Args: {
          p_assigned_by_user_id?: string;
          p_task_id: string;
          p_user_id: string;
        };
        Returns: Json;
      };
      award_team_achievement: {
        Args: { p_achievement_id: string; p_team_id: string };
        Returns: Json;
      };
      calculate_user_week_metrics: {
        Args: { p_user_id: string; p_week_number: number; p_week_year: number };
        Returns: Json;
      };
      cancel_client_meeting: {
        Args: { p_meeting_id: string };
        Returns: undefined;
      };
      cancel_meeting: { Args: { p_meeting_id: string }; Returns: Json };
      check_and_award_achievement: {
        Args: { p_achievement_id: string; p_user_id: string };
        Returns: Json;
      };
      check_missed_weekly_reports: {
        Args: never;
        Returns: {
          missed_weeks: number;
          team_id: string;
        }[];
      };
      check_missed_weekly_reports_team_context: {
        Args: never;
        Returns: {
          team_id: string;
          team_name: string;
          user_id: string;
          user_name: string;
          week_end: string;
          week_number: number;
          week_start: string;
          week_year: number;
        }[];
      };
      check_simple_rate_limit: {
        Args: { p_action_type: string; p_limit?: number; p_user_id: string };
        Returns: boolean;
      };
      complete_client_meeting: {
        Args: { p_meeting_id: string };
        Returns: Json;
      };
      complete_individual_task: {
        Args: {
          p_progress_id: string;
          p_submission_data?: Json;
          p_submission_notes?: string;
        };
        Returns: Json;
      };
      complete_meeting: { Args: { p_meeting_id: string }; Returns: Json };
      complete_team_achievement: {
        Args: { p_achievement_id: string; p_team_id: string };
        Returns: Json;
      };
      create_individual_task_and_assign_to_users: {
        Args: {
          p_achievement_id?: string;
          p_auto_assign_to_new_teams?: boolean;
          p_base_points_reward?: number;
          p_base_xp_reward?: number;
          p_category?: Database["public"]["Enums"]["task_category_type"];
          p_deliverables?: string[];
          p_description?: string;
          p_detailed_instructions?: string;
          p_difficulty_level?: number;
          p_estimated_hours?: number;
          p_learning_objectives?: string[];
          p_minimum_team_level?: number;
          p_peer_review_criteria?: Json;
          p_prerequisite_template_codes?: string[];
          p_priority?: Database["public"]["Enums"]["task_priority_type"];
          p_requires_review?: boolean;
          p_resources?: Json;
          p_review_instructions?: string;
          p_sort_order?: number;
          p_tags?: string[];
          p_template_code: string;
          p_tips_content?: Json;
          p_title: string;
        };
        Returns: Json;
      };
      create_notification: {
        Args: {
          p_data?: Json;
          p_message?: string;
          p_title: string;
          p_type: string;
          p_user_id: string;
        };
        Returns: string;
      };
      create_progress_if_needed_v2: {
        Args: {
          p_context?: string;
          p_task_id: string;
          p_team_id?: string;
          p_user_id?: string;
        };
        Returns: string;
      };
      create_task_and_assign_to_all_teams: {
        Args: {
          p_achievement_id?: string;
          p_auto_assign_to_new_teams?: boolean;
          p_base_points_reward?: number;
          p_base_xp_reward?: number;
          p_category?: Database["public"]["Enums"]["task_category_type"];
          p_deliverables?: string[];
          p_description?: string;
          p_detailed_instructions?: string;
          p_difficulty_level?: number;
          p_estimated_hours?: number;
          p_learning_objectives?: string[];
          p_minimum_team_level?: number;
          p_peer_review_criteria?: Json;
          p_prerequisite_template_codes?: string[];
          p_priority?: Database["public"]["Enums"]["task_priority_type"];
          p_requires_review?: boolean;
          p_resources?: Json;
          p_review_instructions?: string;
          p_sort_order?: number;
          p_tags?: string[];
          p_template_code: string;
          p_tips_content?: Json;
          p_title: string;
        };
        Returns: Json;
      };
      create_team_atomic: {
        Args: {
          p_description: string;
          p_founder_id: string;
          p_team_name: string;
        };
        Returns: Json;
      };
      decrement_team_strikes_count: {
        Args: { team_id_param: string };
        Returns: undefined;
      };
      deprecated_decrement_team_member_count: {
        Args: { team_id: string };
        Returns: undefined;
      };
      disband_all_team_members: {
        Args: { team_id_param: string };
        Returns: undefined;
      };
      distribute_team_rewards: {
        Args: {
          p_points_amount: number;
          p_progress_id?: string;
          p_reviewer_id?: string;
          p_task_id?: string;
          p_task_title?: string;
          p_team_id: string;
          p_xp_amount: number;
        };
        Returns: Json;
      };
      generate_weekly_leaderboard_snapshots: {
        Args: { p_week_number?: number; p_week_year?: number };
        Returns: Json;
      };
      generate_weekly_team_leaderboard_snapshots: {
        Args: { p_week_number?: number; p_week_year?: number };
        Returns: Json;
      };
      get_audit_logs: {
        Args: {
          p_action?: string;
          p_from_date?: string;
          p_limit?: number;
          p_offset?: number;
          p_table_name?: string;
          p_to_date?: string;
          p_user_id?: string;
        };
        Returns: {
          action: string;
          changed_by_email: string;
          changed_by_name: string;
          changed_by_user_id: string;
          changed_fields: string[];
          created_at: string;
          id: string;
          new_data: Json;
          old_data: Json;
          record_id: string;
          table_name: string;
        }[];
      };
      get_available_templates_for_team: {
        Args: { p_team_id: string };
        Returns: {
          category: Database["public"]["Enums"]["task_category_type"];
          credits_reward: number;
          description: string;
          difficulty_level: number;
          estimated_hours: number;
          is_assigned: boolean;
          prerequisites_met: boolean;
          priority: Database["public"]["Enums"]["task_priority_type"];
          sort_order: number;
          task_status: Database["public"]["Enums"]["task_status_type"];
          template_code: string;
          template_id: string;
          title: string;
          xp_reward: number;
        }[];
      };
      get_available_users_for_invitation: {
        Args: { p_search_term?: string; p_team_id: string };
        Returns: {
          avatar_url: string;
          email: string;
          graduation_level: number;
          id: string;
          name: string;
        }[];
      };
      get_enhanced_team_tasks: {
        Args: { p_team_id: string };
        Returns: {
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_avatar_url: string;
          assignee_name: string;
          category: string;
          completed_at: string;
          created_at: string;
          credits_reward: number;
          description: string;
          difficulty_level: number;
          estimated_hours: number;
          is_available: boolean;
          prerequisites_met: boolean;
          priority: Database["public"]["Enums"]["task_priority_type"];
          requires_review: boolean;
          review_instructions: string;
          sort_order: number;
          started_at: string;
          status: Database["public"]["Enums"]["task_status_type"];
          task_id: string;
          template_code: string;
          template_id: string;
          title: string;
          updated_at: string;
          xp_reward: number;
        }[];
      };
      get_invitation_status: {
        Args: never;
        Returns: {
          accepted_at: string;
          email: string;
          first_name: string;
          invited_at: string;
          invited_by: string;
          is_expired: boolean;
          last_name: string;
          status: string;
          user_id: string;
        }[];
      };
      get_leaderboard_data: {
        Args: {
          p_limit?: number;
          p_week_number?: number;
          p_week_year?: number;
        };
        Returns: {
          achievements_change: number;
          achievements_count: number;
          points_change: number;
          rank_change: number;
          rank_position: number;
          tasks_change: number;
          tasks_completed: number;
          team_name: string;
          total_points: number;
          total_xp: number;
          user_avatar_url: string;
          user_email: string;
          user_id: string;
          user_name: string;
          xp_change: number;
        }[];
      };
      get_recurring_task_status: {
        Args: { team_id_param: string; user_id_param?: string };
        Returns: {
          achievement_id: string;
          achievement_name: string;
          cooldown_days: number;
          has_active_instance: boolean;
          is_recurring: boolean;
          last_completion: string;
          latest_progress_id: string;
          next_available: string;
          recurring_status: string;
          task_id: string;
          template_code: string;
          title: string;
        }[];
      };
      get_recurring_task_status_backup: {
        Args: { p_task_id: string; p_team_id: string };
        Returns: {
          cooldown_hours: number;
          is_available: boolean;
          last_completed_at: string;
          next_available_at: string;
          task_id: string;
        }[];
      };
      get_riga_week_boundaries: {
        Args: { input_date?: string };
        Returns: {
          week_end: string;
          week_number: number;
          week_start: string;
          week_year: number;
        }[];
      };
      get_task_history: {
        Args: { p_progress_id: string };
        Returns: {
          description: string;
          event_timestamp: string;
          event_type: string;
          id: string;
          metadata: Json;
          user_email: string;
          user_id: string;
          user_name: string;
        }[];
      };
      get_task_templates_for_admin: {
        Args: {
          p_category?: Database["public"]["Enums"]["task_category_type"];
          p_limit?: number;
          p_offset?: number;
          p_search_term?: string;
        };
        Returns: {
          auto_assign_to_new_teams: boolean;
          base_points_reward: number;
          base_xp_reward: number;
          category: Database["public"]["Enums"]["task_category_type"];
          created_at: string;
          description: string;
          difficulty_level: number;
          id: string;
          is_active: boolean;
          priority: Database["public"]["Enums"]["task_priority_type"];
          requires_review: boolean;
          teams_assigned: number;
          teams_completed: number;
          teams_in_progress: number;
          template_code: string;
          title: string;
          updated_at: string;
        }[];
      };
      get_task_update_impact: { Args: { p_task_id: string }; Returns: Json };
      get_tasks_available_for_review: {
        Args: { p_team_id?: string };
        Returns: {
          assignee_name: string;
          credits_reward: number;
          description: string;
          priority: Database["public"]["Enums"]["task_priority_type"];
          submission_preview: Json;
          submitted_at: string;
          task_id: string;
          team_id: string;
          team_name: string;
          title: string;
          xp_reward: number;
        }[];
      };
      get_tasks_by_achievement: {
        Args: { p_achievement_id?: string; p_team_id?: string };
        Returns: {
          achievement_id: string;
          achievement_name: string;
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_avatar_url: string;
          assignee_name: string;
          base_points_reward: number;
          base_xp_reward: number;
          category: string;
          completed_at: string;
          description: string;
          difficulty_level: number;
          is_available: boolean;
          progress_id: string;
          started_at: string;
          status: string;
          task_id: string;
          title: string;
        }[];
      };
      get_team_achievement_dashboard: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: {
          achievements: Json;
          achievements_unlocked: boolean;
          client_meetings: Json;
          client_meetings_count: number;
          tasks: Json;
        }[];
      };
      get_team_client_meetings_secure: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: {
          call_type: string;
          cancelled_at: string;
          client_name: string;
          client_type: string;
          completed_at: string;
          created_at: string;
          how_it_went: string;
          id: string;
          is_client_name_masked: boolean;
          meeting_data: Json;
          new_things_learned: string;
          responsible_user_id: string;
          status: string;
          user_avatar_url: string;
          user_id: string;
          user_name: string;
        }[];
      };
      get_team_leaderboard_data: {
        Args: {
          p_limit?: number;
          p_week_number?: number;
          p_week_year?: number;
        };
        Returns: {
          meetings_change: number;
          meetings_count: number;
          member_count: number;
          points_change: number;
          rank_change: number;
          rank_position: number;
          tasks_change: number;
          tasks_completed: number;
          team_id: string;
          team_name: string;
          total_points: number;
          total_xp: number;
          xp_change: number;
        }[];
      };
      get_team_meetings: {
        Args: { p_team_id: string };
        Returns: {
          call_type: string;
          cancelled_at: string;
          client_name: string;
          client_type: string;
          completed_at: string;
          created_at: string;
          how_it_went: string;
          id: string;
          meeting_date: string;
          new_things_learned: string;
          responsible_user_avatar: string;
          responsible_user_id: string;
          responsible_user_name: string;
          status: string;
        }[];
      };
      get_team_stats_combined: {
        Args: { p_team_id: string };
        Returns: {
          points_earned: number;
          points_invested: number;
          xp_earned: number;
        }[];
      };
      get_team_strikes: {
        Args: { p_team_id: string };
        Returns: {
          created_at: string;
          explanation: string;
          id: string;
          points_penalty: number;
          reason: string;
          status: string;
          strike_date: string;
          team_id: string;
          user_id: string;
          user_name: string;
          xp_penalty: number;
        }[];
      };
      get_team_tasks_enhanced: {
        Args: { p_team_id: string };
        Returns: {
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_name: string;
          category: string;
          description: string;
          is_available: boolean;
          prerequisites_met: boolean;
          priority: Database["public"]["Enums"]["task_priority_type"];
          requires_review: boolean;
          sort_order: number;
          status: Database["public"]["Enums"]["task_status_type"];
          task_id: string;
          template_code: string;
          title: string;
          xp_reward: number;
        }[];
      };
      get_team_tasks_from_progress: {
        Args: { p_team_id: string };
        Returns: {
          assigned_to_user_id: string;
          assignee_name: string;
          base_points_reward: number;
          base_xp_reward: number;
          category: Database["public"]["Enums"]["task_category_type"];
          completed_at: string;
          created_at: string;
          description: string;
          difficulty_level: number;
          progress_id: string;
          started_at: string;
          status: Database["public"]["Enums"]["task_status_type"];
          task_id: string;
          title: string;
        }[];
      };
      get_team_tasks_simple: {
        Args: { p_team_id: string };
        Returns: {
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_avatar_url: string;
          assignee_name: string;
          base_xp_reward: number;
          category: Database["public"]["Enums"]["task_category_type"];
          completed_at: string;
          deliverables: string[];
          description: string;
          detailed_instructions: string;
          difficulty_level: number;
          is_available: boolean;
          learning_objectives: string[];
          peer_review_criteria: Json;
          priority: Database["public"]["Enums"]["task_priority_type"];
          progress_id: string;
          resources: Json;
          started_at: string;
          status: Database["public"]["Enums"]["task_status_type"];
          task_id: string;
          tips_content: Json;
          title: string;
        }[];
      };
      get_team_tasks_visible: {
        Args: { p_team_id: string; p_user_id?: string };
        Returns: {
          achievement_id: string;
          achievement_name: string;
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_avatar_url: string;
          assignee_name: string;
          base_points_reward: number;
          base_xp_reward: number;
          category: string;
          completed_at: string;
          deliverables: string;
          detailed_instructions: string;
          difficulty_level: number;
          estimated_hours: number;
          is_available: boolean;
          is_confidential: boolean;
          learning_objectives: string;
          peer_review_criteria: string;
          priority: string;
          progress_id: string;
          progress_status: Database["public"]["Enums"]["task_status_type"];
          resources: string;
          reviewer_notes: string;
          sort_order: number;
          started_at: string;
          task_description: string;
          task_id: string;
          task_title: string;
          tips_content: string;
        }[];
      };
      get_team_tasks_with_availability: {
        Args: { p_team_id: string };
        Returns: {
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_avatar_url: string;
          assignee_name: string;
          category: string;
          completed_at: string;
          created_at: string;
          credits_reward: number;
          description: string;
          difficulty_level: number;
          estimated_hours: number;
          is_available: boolean;
          prerequisites_met: boolean;
          priority: Database["public"]["Enums"]["task_priority_type"];
          requires_review: boolean;
          review_instructions: string;
          sort_order: number;
          started_at: string;
          status: Database["public"]["Enums"]["task_status_type"];
          task_id: string;
          template_code: string;
          template_id: string;
          title: string;
          updated_at: string;
          xp_reward: number;
        }[];
      };
      get_team_weekly_status: {
        Args: { p_team_id: string };
        Returns: {
          has_submitted: boolean;
          submitted_at: string;
          user_avatar_url: string;
          user_email: string;
          user_id: string;
          user_name: string;
        }[];
      };
      get_teams_with_stats: {
        Args: never;
        Returns: {
          created_at: string;
          id: string;
          meetings_count: number;
          member_count: number;
          name: string;
          status: Database["public"]["Enums"]["status_state"];
          tasks_completed: number;
          total_points: number;
        }[];
      };
      get_top_teams_with_xp: {
        Args: { team_limit?: number };
        Returns: {
          id: string;
          name: string;
          team_points: number;
          total_xp: number;
        }[];
      };
      get_user_achievement_progress: {
        Args: { p_user_id: string };
        Returns: {
          achievement_description: string;
          achievement_icon: string;
          achievement_id: string;
          achievement_name: string;
          color_theme: string;
          completed_tasks: number;
          is_completed: boolean;
          points_reward: number;
          sort_order: number;
          status: string;
          total_tasks: number;
          xp_reward: number;
        }[];
      };
      get_user_individual_tasks: {
        Args: { p_user_id: string };
        Returns: {
          base_points_reward: number;
          base_xp_reward: number;
          category: Database["public"]["Enums"]["task_category_type"];
          completed_at: string;
          created_at: string;
          description: string;
          difficulty_level: number;
          progress_id: string;
          started_at: string;
          status: Database["public"]["Enums"]["task_status_type"];
          submission_data: Json;
          task_id: string;
          title: string;
        }[];
      };
      get_user_tasks_visible: {
        Args: { p_user_id: string };
        Returns: {
          achievement_id: string;
          achievement_name: string;
          assigned_at: string;
          assigned_to_user_id: string;
          assignee_avatar_url: string;
          assignee_name: string;
          base_points_reward: number;
          base_xp_reward: number;
          category: Database["public"]["Enums"]["task_category_type"];
          completed_at: string;
          deliverables: string;
          detailed_instructions: string;
          difficulty_level: number;
          estimated_hours: number;
          is_available: boolean;
          learning_objectives: string;
          peer_review_criteria: string;
          priority: Database["public"]["Enums"]["task_priority_type"];
          progress_id: string;
          progress_status: Database["public"]["Enums"]["task_status_type"];
          resources: string;
          reviewer_notes: string;
          sort_order: number;
          started_at: string;
          task_description: string;
          task_id: string;
          task_title: string;
          tips_content: string;
        }[];
      };
      get_user_tasks_with_feedback: {
        Args: { p_user_id: string };
        Returns: {
          assigned_at: string;
          base_points_reward: number;
          base_xp_reward: number;
          completed_at: string;
          description: string;
          difficulty_level: number;
          peer_review_feedback: string;
          progress_id: string;
          reviewer_avatar_url: string;
          reviewer_name: string;
          status: Database["public"]["Enums"]["task_status_type"];
          team_name: string;
          title: string;
        }[];
      };
      has_user_submitted_this_week: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: boolean;
      };
      increment_team_member_count: {
        Args: { team_id: string };
        Returns: undefined;
      };
      is_task_recurring: { Args: { task_id: string }; Returns: boolean };
      mark_all_notifications_seen: {
        Args: { user_id_param: string };
        Returns: number;
      };
      mark_notification_read: {
        Args: { p_notification_id: string; p_user_id: string };
        Returns: boolean;
      };
      parse_review_instructions_to_criteria: {
        Args: { review_text: string };
        Returns: Json;
      };
      reassign_task: {
        Args: {
          p_new_user_id: string;
          p_progress_id: string;
          p_reassigned_by_user_id: string;
        };
        Returns: {
          message: string;
          success: boolean;
        }[];
      };
      remove_team_member_v2: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: undefined;
      };
      reset_available_recurring_tasks: {
        Args: never;
        Returns: {
          reset_count: number;
          task_id: string;
          task_title: string;
        }[];
      };
      reset_available_recurring_tasks_backup_v2: {
        Args: never;
        Returns: {
          task_id: string;
          task_title: string;
        }[];
      };
      resubmit_task_for_review: { Args: { p_task_id: string }; Returns: Json };
      retry_rejected_task: { Args: { p_task_id: string }; Returns: Json };
      save_meeting_draft: {
        Args: {
          p_call_type?: string;
          p_client_name: string;
          p_client_type?: string;
          p_how_it_went?: string;
          p_meeting_data?: Json;
          p_new_things_learned?: string;
          p_responsible_user_id: string;
          p_team_id: string;
        };
        Returns: Json;
      };
      save_weekly_report_draft: {
        Args: {
          p_submission_data: Json;
          p_team_id: string;
          p_user_id: string;
          p_week_end_date: string;
          p_week_number: number;
          p_week_start_date: string;
          p_week_year: number;
        };
        Returns: Json;
      };
      send_weekly_report_reminders: { Args: never; Returns: number };
      start_individual_task: { Args: { p_progress_id: string }; Returns: Json };
      start_recurring_task: {
        Args: {
          task_id_param: string;
          team_id_param: string;
          user_id_param: string;
        };
        Returns: {
          message: string;
          progress_id: string;
        }[];
      };
      start_recurring_task_backup: {
        Args: { p_task_id: string; p_team_id: string; p_user_id: string };
        Returns: string;
      };
      start_task: { Args: { p_task_id: string }; Returns: Json };
      submit_external_peer_review: {
        Args: {
          p_decision: string;
          p_feedback?: string;
          p_is_continuation?: boolean;
          p_progress_id: string;
        };
        Returns: Json;
      };
      submit_external_peer_review_backup_v2: {
        Args: {
          p_decision: string;
          p_feedback: string;
          p_is_continuation?: boolean;
          p_progress_id: string;
        };
        Returns: Json;
      };
      submit_external_peer_review_backup_v3: {
        Args: {
          p_decision: string;
          p_feedback?: string;
          p_is_continuation?: boolean;
          p_progress_id: string;
        };
        Returns: Json;
      };
      submit_peer_review: {
        Args: {
          p_completeness_score?: number;
          p_decision: string;
          p_feedback?: string;
          p_overall_score?: number;
          p_quality_score?: number;
          p_review_data?: Json;
          p_task_id: string;
        };
        Returns: Json;
      };
      submit_peer_review_with_rate_limit: {
        Args: {
          p_decision: string;
          p_feedback?: string;
          p_reviewer_user_id: string;
          p_task_progress_id: string;
        };
        Returns: Json;
      };
      submit_strike_explanation: {
        Args: { p_explanation: string; p_strike_id: string };
        Returns: boolean;
      };
      update_meeting_draft: {
        Args: {
          p_call_type?: string;
          p_client_name?: string;
          p_client_type?: string;
          p_how_it_went?: string;
          p_meeting_data?: Json;
          p_meeting_id: string;
          p_new_things_learned?: string;
        };
        Returns: Json;
      };
      update_task_status_deprecated: {
        Args: {
          p_progress_id: string;
          p_status: Database["public"]["Enums"]["task_status_type"];
          p_submission_data?: Json;
          p_submission_notes?: string;
        };
        Returns: {
          message: string;
          success: boolean;
        }[];
      };
      update_task_template: {
        Args: {
          p_base_points_reward?: number;
          p_base_xp_reward?: number;
          p_category?: Database["public"]["Enums"]["task_category_type"];
          p_deliverables?: string[];
          p_description?: string;
          p_detailed_instructions?: string;
          p_difficulty_level?: number;
          p_estimated_hours?: number;
          p_learning_objectives?: string[];
          p_peer_review_criteria?: Json;
          p_priority?: Database["public"]["Enums"]["task_priority_type"];
          p_propagation_mode?: string;
          p_requires_review?: boolean;
          p_resources?: Json;
          p_review_instructions?: string;
          p_tags?: string[];
          p_task_id: string;
          p_tips_content?: Json;
          p_title?: string;
        };
        Returns: Json;
      };
      update_team_member_role_v2: {
        Args: {
          p_new_role: Database["public"]["Enums"]["team_role_type"];
          p_team_id: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      update_team_strikes_count: {
        Args: { team_id_param: string };
        Returns: undefined;
      };
      update_user_profile: {
        Args: { p_avatar_url?: string; p_name: string };
        Returns: Json;
      };
      user_can_manage_task: {
        Args: { p_action: string; p_progress_id: string; p_user_id: string };
        Returns: {
          can_manage: boolean;
          is_assigned_user: boolean;
          user_role: string;
        }[];
      };
      user_can_see_confidential_tasks: {
        Args: { p_team_id: string; p_user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      peer_review_status_type:
        | "pending_assignment"
        | "assigned"
        | "in_review"
        | "completed"
        | "cancelled";
      primary_role_type: "user" | "admin";
      revenue_type: "recurring" | "one_time";
      status_state: "active" | "archived";
      task_category_type:
        | "onboarding"
        | "development"
        | "design"
        | "marketing"
        | "business"
        | "testing"
        | "deployment"
        | "milestone"
        | "customer-acquisition"
        | "product-foundation"
        | "idea-validation"
        | "repeatable-tasks"
        | "team-growth"
        | "legal-finance"
        | "pitch";
      task_context_type: "individual" | "team";
      task_history_action_type:
        | "created"
        | "assigned"
        | "unassigned"
        | "status_changed"
        | "updated"
        | "deleted";
      task_priority_type: "low" | "medium" | "high" | "urgent";
      task_status_type:
        | "not_started"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "pending_review"
        | "approved"
        | "rejected"
        | "revision_required";
      team_role_type: "member" | "leader" | "founder" | "co_founder";
      transaction_type:
        | "task"
        | "revenue"
        | "validation"
        | "team_cost"
        | "achievement"
        | "meeting";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

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
        "customer-acquisition",
        "product-foundation",
        "idea-validation",
        "repeatable-tasks",
        "team-growth",
        "legal-finance",
        "pitch",
      ],
      task_context_type: ["individual", "team"],
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
        "meeting",
      ],
    },
  },
} as const;
