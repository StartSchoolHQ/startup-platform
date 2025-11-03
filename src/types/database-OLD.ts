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
          active?: boolean;
          color_theme?: string | null;
          created_at?: string;
          credits_reward?: number | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          sort_order?: number;
          xp_reward?: number | null;
        };
        Update: {
          active?: boolean;
          color_theme?: string | null;
          created_at?: string;
          credits_reward?: number | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          xp_reward?: number | null;
        };
        Relationships: [];
      };
      client_meetings: {
        Row: {
          cancelled_at: string | null;
          client_name: string;
          completed_at: string | null;
          created_at: string | null;
          id: string;
          meeting_date: string | null;
          responsible_user_id: string;
          status: string;
          team_id: string;
          updated_at: string | null;
        };
        Insert: {
          cancelled_at?: string | null;
          client_name: string;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          meeting_date?: string | null;
          responsible_user_id: string;
          status?: string;
          team_id: string;
          updated_at?: string | null;
        };
        Update: {
          cancelled_at?: string | null;
          client_name?: string;
          completed_at?: string | null;
          created_at?: string | null;
          id?: string;
          meeting_date?: string | null;
          responsible_user_id?: string;
          status?: string;
          team_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_meetings_responsible_user_id_fkey";
            columns: ["responsible_user_id"];
            isOneToOne: false;
            referencedRelation: "user_progress";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_meetings_responsible_user_id_fkey";
            columns: ["responsible_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_meetings_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      revenue_streams: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          mrr_amount: number;
          product_name: string;
          started_at: string | null;
          team_id: string | null;
          type: Database["public"]["Enums"]["revenue_type"];
          user_id: string | null;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          mrr_amount?: number;
          product_name: string;
          started_at?: string | null;
          team_id?: string | null;
          type: Database["public"]["Enums"]["revenue_type"];
          user_id?: string | null;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          mrr_amount?: number;
          product_name?: string;
          started_at?: string | null;
          team_id?: string | null;
          type?: Database["public"]["Enums"]["revenue_type"];
          user_id?: string | null;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "fk_revenue_streams_team_id";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_revenue_streams_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_progress";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_revenue_streams_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tasks: {
        Row: {
          achievement_id: string;
          base_credits: number;
          base_xp: number;
          created_at: string;
          description: string | null;
          hours: number;
          id: string;
          is_team_task: boolean;
          level: number;
          name: string;
        };
        Insert: {
          achievement_id: string;
          base_credits?: number;
          base_xp?: number;
          created_at?: string;
          description?: string | null;
          hours: number;
          id?: string;
          is_team_task?: boolean;
          level: number;
          name: string;
        };
        Update: {
          achievement_id?: string;
          base_credits?: number;
          base_xp?: number;
          created_at?: string;
          description?: string | null;
          hours?: number;
          id?: string;
          is_team_task?: boolean;
          level?: number;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_tasks_achievement_id";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: {
          id: string;
          joined_at: string;
          left_at: string | null;
          team_id: string;
          team_role: Database["public"]["Enums"]["team_role_type"];
          user_id: string;
        };
        Insert: {
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          team_id: string;
          team_role?: Database["public"]["Enums"]["team_role_type"];
          user_id: string;
        };
        Update: {
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          team_id?: string;
          team_role?: Database["public"]["Enums"]["team_role_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_team_members_team_id";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_team_members_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_progress";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_team_members_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      team_strikes: {
        Row: {
          id: string;
          team_id: string;
          user_id: string | null;
          strike_type: string;
          title: string;
          description: string | null;
          xp_penalty: number | null;
          credits_penalty: number | null;
          status: string | null;
          explanation: string | null;
          explained_by_user_id: string | null;
          explained_at: string | null;
          resolved_by_user_id: string | null;
          resolved_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id?: string | null;
          strike_type: string;
          title: string;
          description?: string | null;
          xp_penalty?: number | null;
          credits_penalty?: number | null;
          status?: string | null;
          explanation?: string | null;
          explained_by_user_id?: string | null;
          explained_at?: string | null;
          resolved_by_user_id?: string | null;
          resolved_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string | null;
          strike_type?: string;
          title?: string;
          description?: string | null;
          xp_penalty?: number | null;
          credits_penalty?: number | null;
          status?: string | null;
          explanation?: string | null;
          explained_by_user_id?: string | null;
          explained_at?: string | null;
          resolved_by_user_id?: string | null;
          resolved_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "team_strikes_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_strikes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      teams: {
        Row: {
          archived_at: string | null;
          created_at: string;
          current_week: number;
          formation_cost: number;
          id: string;
          name: string;
          status: Database["public"]["Enums"]["status_state"];
          strikes_count: number | null;
          weekly_maintenance_cost: number;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          current_week?: number;
          formation_cost?: number;
          id?: string;
          name: string;
          status?: Database["public"]["Enums"]["status_state"];
          strikes_count?: number | null;
          weekly_maintenance_cost?: number;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          current_week?: number;
          formation_cost?: number;
          id?: string;
          name?: string;
          status?: Database["public"]["Enums"]["status_state"];
          strikes_count?: number | null;
          weekly_maintenance_cost?: number;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          achievement_id: string | null;
          created_at: string;
          credits_change: number;
          description: string | null;
          id: string;
          metadata: Json;
          revenue_stream_id: string | null;
          task_id: string | null;
          team_id: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
          validated_by_user_id: string | null;
          week_number: number | null;
          xp_change: number;
        };
        Insert: {
          achievement_id?: string | null;
          created_at?: string;
          credits_change?: number;
          description?: string | null;
          id?: string;
          metadata?: Json;
          revenue_stream_id?: string | null;
          task_id?: string | null;
          team_id?: string | null;
          type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
          validated_by_user_id?: string | null;
          week_number?: number | null;
          xp_change?: number;
        };
        Update: {
          achievement_id?: string | null;
          created_at?: string;
          credits_change?: number;
          description?: string | null;
          id?: string;
          metadata?: Json;
          revenue_stream_id?: string | null;
          task_id?: string | null;
          team_id?: string | null;
          type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
          validated_by_user_id?: string | null;
          week_number?: number | null;
          xp_change?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fk_tx_achievement_id";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          },
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
            foreignKeyName: "fk_tx_team_id";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_tx_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_progress";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_tx_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_tx_validated_by_user_id";
            columns: ["validated_by_user_id"];
            isOneToOne: false;
            referencedRelation: "user_progress";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_tx_validated_by_user_id";
            columns: ["validated_by_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_task_completions: {
        Row: {
          completion_count: number;
          id: string;
          last_completed_at: string | null;
          task_id: string;
          total_xp_earned: number;
          user_id: string;
        };
        Insert: {
          completion_count?: number;
          id?: string;
          last_completed_at?: string | null;
          task_id: string;
          total_xp_earned?: number;
          user_id: string;
        };
        Update: {
          completion_count?: number;
          id?: string;
          last_completed_at?: string | null;
          task_id?: string;
          total_xp_earned?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_utc_task_id";
            columns: ["task_id"];
            isOneToOne: false;
            referencedRelation: "tasks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_utc_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_progress";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_utc_user_id";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_reports: {
        Row: {
          id: string;
          user_id: string;
          team_id: string;
          week_start_date: string;
          week_end_date: string;
          week_number: number;
          week_year: number;
          submission_data: Json;
          submitted_at: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          team_id: string;
          week_start_date: string;
          week_end_date: string;
          week_number: number;
          week_year: number;
          submission_data?: Json;
          submitted_at?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          team_id?: string;
          week_start_date?: string;
          week_end_date?: string;
          week_number?: number;
          week_year?: number;
          submission_data?: Json;
          submitted_at?: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_reports_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weekly_reports_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      users: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          daily_validation_xp: number;
          email: string;
          graduation_level: number | null;
          id: string;
          name: string | null;
          primary_role: Database["public"]["Enums"]["primary_role_type"];
          status: Database["public"]["Enums"]["status_state"];
          total_credits: number;
          total_xp: number;
          updated_at: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          daily_validation_xp?: number;
          email: string;
          graduation_level?: number | null;
          id?: string;
          name?: string | null;
          primary_role?: Database["public"]["Enums"]["primary_role_type"];
          status?: Database["public"]["Enums"]["status_state"];
          total_credits?: number;
          total_xp?: number;
          updated_at?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          daily_validation_xp?: number;
          email?: string;
          graduation_level?: number | null;
          id?: string;
          name?: string | null;
          primary_role?: Database["public"]["Enums"]["primary_role_type"];
          status?: Database["public"]["Enums"]["status_state"];
          total_credits?: number;
          total_xp?: number;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      user_progress: {
        Row: {
          daily_validation_xp: number | null;
          graduation_level: number | null;
          id: string | null;
          name: string | null;
          status: Database["public"]["Enums"]["status_state"] | null;
          total_credits: number | null;
          total_xp: number | null;
        };
        Insert: {
          daily_validation_xp?: number | null;
          graduation_level?: number | null;
          id?: string | null;
          name?: string | null;
          status?: Database["public"]["Enums"]["status_state"] | null;
          total_credits?: number | null;
          total_xp?: number | null;
        };
        Update: {
          daily_validation_xp?: number | null;
          graduation_level?: number | null;
          id?: string | null;
          name?: string | null;
          status?: Database["public"]["Enums"]["status_state"] | null;
          total_credits?: number | null;
          total_xp?: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      primary_role_type: "user" | "admin";
      revenue_type: "recurring" | "one_time";
      status_state: "active" | "archived";
      team_role_type: "member" | "leader";
      transaction_type: "task" | "revenue" | "validation" | "team_cost";
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
    : never = never
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
    : never = never
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
    : never = never
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

// Helper types for your application
// Helper types for your application
export type User = Tables<"users">;
export type Team = Tables<"teams">;
export type Achievement = Tables<"achievements">;
export type Task = Tables<"tasks">;
export type Transaction = Tables<"transactions">;
export type UserTaskCompletion = Tables<"user_task_completions">;
export type TeamMember = Tables<"team_members">;
export type TeamStrike = Tables<"team_strikes">;
export type WeeklyReport = Tables<"weekly_reports">;
export type RevenueStream = Tables<"revenue_streams">;
export type ClientMeeting = Tables<"client_meetings">;
