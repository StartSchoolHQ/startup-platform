"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

  if (isProcessingInvite) {
    return (
      <main className="bg-background flex min-h-screen w-full items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Processing invitation...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background min-h-screen w-full">
      <HeroLanding />
    </main>
  );
}
