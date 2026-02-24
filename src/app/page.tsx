"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { HeroLanding } from "@/components/hero-landing";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [isProcessingInvite, setIsProcessingInvite] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleInviteAuth = async () => {
      // Check if URL has invitation tokens in hash
      const hash = window.location.hash;

      // Check for error in hash (e.g., expired invite link)
      if (hash.includes("error=")) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const error = hashParams.get("error");
        const errorCode = hashParams.get("error_code");
        const errorDescription = hashParams.get("error_description");

        console.log("Auth error detected:", {
          error,
          errorCode,
          errorDescription,
        });

        // Redirect to invite-expired page with error details
        router.push(
          `/auth/invite-expired?error=${encodeURIComponent(
            errorDescription || error || "Unknown error"
          )}`
        );
        return;
      }

      if (hash.includes("access_token") && hash.includes("type=invite")) {
        setIsProcessingInvite(true);
        console.log("Processing invitation with hash:", hash);

        try {
          const supabase = createClient();

          // Parse the hash tokens manually
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          const expiresIn = hashParams.get("expires_in");
          const tokenType = hashParams.get("token_type");

          console.log("Hash tokens:", {
            accessToken: accessToken ? "present" : "missing",
            refreshToken,
            expiresIn,
            tokenType,
          });

          if (!accessToken || !refreshToken) {
            console.error("Missing required tokens in hash");
            setIsProcessingInvite(false);
            router.push("/login?error=missing_tokens");
            return;
          }

          // Manually set the session using the tokens from the hash
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          console.log("Set session result:", {
            session: sessionData.session ? "established" : "failed",
            user: sessionData.user?.email,
            error: sessionError,
          });

          if (sessionData.session && sessionData.user) {
            const user = sessionData.user;
            console.log("User authenticated:", user.email);

            // Don't try to create profile here - let the profile setup page handle it
            console.log("User authenticated, proceeding to profile setup");

            // Clear the hash from URL first
            window.history.replaceState(
              {},
              document.title,
              window.location.pathname
            );

            console.log("Redirecting to profile setup");
            // Always redirect new invited users to profile setup
            router.push("/profile/setup");
            return;
          }

          // Session establishment failed
          console.log("Session establishment failed");
          setIsProcessingInvite(false);
          router.push("/login?error=session_failed");
        } catch (error) {
          console.error(
            "Unexpected error during invitation processing:",
            error
          );
          setIsProcessingInvite(false);
          router.push("/login?error=processing_failed");
        }
      }
    };

    handleInviteAuth();
  }, [router]);

  return (
    <AnimatePresence mode="wait">
      {isProcessingInvite ? (
        <motion.main
          key="processing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0000dd]"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#ff78c8]/30 border-t-[#ff78c8]"></div>
            <p className="mt-4 text-sm font-medium text-white/70">
              Processing invitation...
            </p>
          </div>
        </motion.main>
      ) : (
        <motion.main
          key="hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="min-h-screen w-full"
        >
          <HeroLanding />
        </motion.main>
      )}
    </AnimatePresence>
  );
}
