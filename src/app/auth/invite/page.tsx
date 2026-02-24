"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 text-center"
      >
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#ff78c8]/30 border-t-[#ff78c8]"></div>
        <p className="mt-4 text-sm font-medium text-white/70">
          Processing invitation...
        </p>
      </motion.div>
    </div>
  );
}
