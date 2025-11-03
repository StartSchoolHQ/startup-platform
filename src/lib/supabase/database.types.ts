export type Json =[TYPES CONTENT TOO LARGE - SEE PREVIOUS TOOL OUTPUT]

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
      users: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          daily_validation_xp: number | null
          email: string
          graduation_level: number | null
          id: string
          individual_points: number | null
          name: string | null
          primary_role: Database["public"]["Enums"]["primary_role_type"] | null
          status: Database["public"]["Enums"]["status_state"] | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          daily_validation_xp?: number | null
          email: string
          graduation_level?: number | null
          id?: string
          individual_points?: number | null
          name?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role_type"] | null
          status?: Database["public"]["Enums"]["status_state"] | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          daily_validation_xp?: number | null
          email?: string
          graduation_level?: number | null
          id?: string
          individual_points?: number | null
          name?: string | null
          primary_role?: Database["public"]["Enums"]["primary_role_type"] | null
          status?: Database["public"]["Enums"]["status_state"] | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: []
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
          team_points: number | null
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
          team_points?: number | null
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
          team_points?: number | null
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
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          points_change: number | null
          points_type: string | null
          revenue_stream_id: string | null
          task_id: string | null
          team_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          validated_by_user_id: string | null
          week_number: number | null
          xp_change: number | null
        }
        Insert: {
          achievement_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points_change?: number | null
          points_type?: string | null
          revenue_stream_id?: string | null
          task_id?: string | null
          team_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
          validated_by_user_id?: string | null
          week_number?: number | null
          xp_change?: number | null
        }
        Update: {
          achievement_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          points_change?: number | null
          points_type?: string | null
          revenue_stream_id?: string | null
          task_id?: string | null
          team_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
          validated_by_user_id?: string | null
          week_number?: number | null
          xp_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {}
    Functions: {}
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
    CompositeTypes: {}
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
