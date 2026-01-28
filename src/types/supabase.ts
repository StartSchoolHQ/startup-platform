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
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_user_profile: {
        Args: {
          p_name: string;
          p_avatar_url?: string | null;
        };
        Returns: Json;
      };
      get_teams_with_stats: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          name: string;
          status: string;
          created_at: string;
          total_points: number;
          member_count: number;
          meetings_count: number;
          tasks_completed: number;
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
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
