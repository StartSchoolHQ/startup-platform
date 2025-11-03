"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  total_xp: number | null;
  individual_points: number | null;
  graduation_level: number | null;
  created_at: string | null;
}

interface AppContextType {
  user: User | null;
  loading: boolean;
  firstName: string;
  refreshUserData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = async () => {
    try {
      const supabase = createClient();

      // Get current authenticated user
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setLoading(false);
        return;
      }

      // Get user profile from our users table
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select(
          "id, name, email, avatar_url, total_xp, individual_points, graduation_level, created_at"
        )
        .eq("id", authUser.id)
        .single();

      if (profileError || !userProfile) {
        setLoading(false);
        return;
      }

      setUser(userProfile);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (!user?.id) return;

    try {
      const supabase = createClient();
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select(
          "id, name, email, avatar_url, total_xp, individual_points, graduation_level, created_at"
        )
        .eq("id", user.id)
        .single();

      if (!profileError && userProfile) {
        setUser(userProfile);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "User";

  return (
    <AppContext.Provider value={{ user, loading, firstName, refreshUserData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export const useAppContext = useApp;
