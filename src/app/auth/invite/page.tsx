"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { waitForProfile, isProfileComplete } from "@/lib/profile-utils";

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

        // Wait for trigger to create profile (handles race condition)
        const userProfile = await waitForProfile(supabase, user.id);

        if (!userProfile) {
          console.error("Profile not created for invited user:", user.id);
          router.push("/login?error=profile_not_found");
          return;
        }

        if (!isProfileComplete(userProfile)) {
          // Profile exists but is incomplete (expected for new invites)
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
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
        <p className="mt-4 text-gray-600">Processing invitation...</p>
      </div>
    </div>
  );
}
