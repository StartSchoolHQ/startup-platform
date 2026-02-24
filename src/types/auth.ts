import { User as SupabaseUser } from "@supabase/supabase-js";
import type { Database } from "./database";

type DbUser = Database["public"]["Tables"]["users"]["Row"];

// Extended user type that combines Supabase auth user with our custom user data
export type AuthUser = SupabaseUser;

// Our application user profile from the database
export interface UserProfile extends DbUser {
  // Additional computed fields we might need
  displayName: string;
  initials: string;
  avatarUrl?: string;
}

// Auth session state
export interface AuthSession {
  user: AuthUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Login form data
export interface LoginCredentials {
  email: string;
  password: string;
}

// Auth actions
export interface AuthActions {
  signIn: (credentials: LoginCredentials) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Auth context type
export interface AuthContextType extends AuthSession, AuthActions {}

// Invitation types for invitation-only registration
export interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  used_at?: string;
  status: "pending" | "used" | "expired";
}
