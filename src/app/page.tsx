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
          className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[oklch(0.17_0.035_275)] text-white"
        >
          <div
            aria-hidden
            className="bg-primary/40 pointer-events-none absolute -top-48 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full blur-[140px]"
          />
          <div className="relative z-10 text-center">
            <div className="border-primary/30 border-t-primary mx-auto h-10 w-10 animate-spin rounded-full border-2"></div>
            <p className="mt-4 text-sm font-medium text-white/70">
              Setting up your invitation…
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
