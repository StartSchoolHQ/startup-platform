"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";

interface User {
  id: string;
  name: string | null;
  email: string;
  avatar_url: string | null;
  primary_role: string | null;
  total_xp: number | null;
  total_points: number | null;
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
  const [mounted, setMounted] = useState(false);

  // Only mount on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  const loadUser = useCallback(async () => {
    if (!mounted) return;

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
          "id, name, email, avatar_url, primary_role, total_xp, total_points, graduation_level, created_at"
        )
        .eq("id", authUser.id)
        .single();

      if (profileError || !userProfile) {
        console.error("Error loading user profile:", profileError);
        setLoading(false);
        return;
      }

      setUser(userProfile);
    } catch (error) {
      console.error("Error loading user:", error);
    } finally {
      setLoading(false);
    }
  }, [mounted]);

  const refreshUserData = useCallback(async () => {
    if (!mounted || !user?.id) return;

    try {
      const supabase = createClient();
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select(
          "id, name, email, avatar_url, primary_role, total_xp, total_points, graduation_level, created_at"
        )
        .eq("id", user.id)
        .single();

      if (!profileError && userProfile) {
        setUser(userProfile);
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  }, [mounted, user?.id]);

  useEffect(() => {
    if (mounted) {
      loadUser();
    }
  }, [loadUser, mounted]);

  const firstName = user?.name?.split(" ")[0] || "User";

  // Only render the provider after mounting to avoid SSR hydration issues
  if (!mounted) {
    return <div>{children}</div>;
  }

  return (
    <AppContext.Provider value={{ user, loading, firstName, refreshUserData }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    // Return safe defaults instead of throwing during SSR/hydration
    return {
      user: null,
      loading: true,
      firstName: "User",
      refreshUserData: async () => {},
    };
  }
  return context;
}

export const useAppContext = useApp;
