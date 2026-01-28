"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  refreshUserData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Query function to fetch user data
async function fetchUserProfile(): Promise<User | null> {
  const supabase = createClient();

  // Get current authenticated user
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !authUser) {
    return null;
  }

  // Get user profile from our users table
  const { data: userProfile, error: profileError } = await supabase
    .from("users")
    .select(
      "id, name, email, avatar_url, primary_role, total_xp, total_points, graduation_level, created_at"
    )
    .eq("id", authUser.id)
    .single();

  if (profileError) {
    // If profile doesn't exist (PGRST116), that's expected for new users
    if (profileError.code !== "PGRST116") {
      console.error("Error loading user profile:", profileError);
    }
    return null;
  }

  return userProfile || null;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  // Only mount on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use React Query for user data
  const {
    data: user = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["user", "profile"],
    queryFn: fetchUserProfile,
    enabled: mounted, // Only run query after client-side mount
    staleTime: 5 * 60 * 1000, // 5 minutes - user data doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    retry: 1,
  });

  // Memoize callback to prevent re-creating function on every render
  const refreshUserData = useCallback(() => {
    refetch();
  }, [refetch]);

  // Memoize computed value to prevent recalculation
  const firstName = useMemo(
    () => user?.name?.split(" ")[0] || "User",
    [user?.name]
  );

  // Memoize context value to prevent unnecessary re-renders of all consumers
  // Include !mounted in loading state to show loading during initial client-side mount
  const contextValue = useMemo(
    () => ({
      user,
      loading: isLoading || !mounted,
      firstName,
      refreshUserData,
    }),
    [user, isLoading, mounted, firstName, refreshUserData]
  );

  // Always provide context (no hydration issues since we're client-only after server auth check)
  // The mounted state ensures React Query doesn't run until client-side is ready
  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
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
