"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function InviteAcceptPage() {
  const router = useRouter();

  useEffect(() => {
    const handleInviteAuth = async () => {
      const supabase = createClient();
      
      // Get session from URL hash (for implicit flow)
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Auth error:", error);
        router.push("/login?error=invalid_invitation");
        return;
      }

      if (data.session) {
        const user = data.session.user;
        
        // Check if user exists in our users table
        const { data: userProfile, error: profileError } = await supabase
          .from("users")
          .select("id, name, avatar_url, email")
          .eq("id", user.id)
          .single();

        if (profileError && profileError.code === "PGRST116") {
          // User doesn't exist in our table, create basic profile
          const { error: insertError } = await supabase.from("users").insert({
            id: user.id,
            email: user.email || "",
            name: null,
            avatar_url: null,
          });

          if (insertError) {
            console.error("Failed to create user profile:", insertError);
          }
          // Redirect to profile setup for new users
          router.push("/profile/setup");
          return;
        } else if (!userProfile?.name || !userProfile?.avatar_url) {
          // Profile exists but is incomplete
          router.push("/profile/setup");
          return;
        }
        
        // Profile is complete, go to dashboard
        router.push("/dashboard");
      } else {
        // No session, redirect to login
        router.push("/login");
      }
    };

    handleInviteAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing invitation...</p>
      </div>
    </div>
  );
}