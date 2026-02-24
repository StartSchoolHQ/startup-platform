"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

function InviteAcceptContent() {
  const [status, setStatus] = useState<"processing" | "error" | "redirecting">(
    "processing"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleInviteAuth = async () => {
      const supabase = createClient();

      // Check for hash-based tokens first (implicit flow)
      const hash = window.location.hash;
      if (hash.includes("access_token") && hash.includes("type=invite")) {
        console.log("Hash-based invitation detected");
        // Wait a bit for Supabase to process the hash
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Then check for PKCE flow (code in URL params)
      const code = searchParams.get("code");

      if (code) {
        // Handle PKCE flow
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("PKCE Auth error:", error);
          setStatus("error");
          setErrorMessage("Failed to process invitation. Please try again.");
          return;
        }
      }

      // Check for session (either from PKCE or hash-based auth)
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Session error:", error);
        setStatus("error");
        setErrorMessage("Authentication failed. Please try again.");
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
            setStatus("error");
            setErrorMessage("Failed to setup user profile. Please try again.");
            return;
          }
        }

        setStatus("redirecting");

        // Check if profile is complete
        if (!userProfile?.name || !userProfile?.avatar_url) {
          // Profile incomplete, redirect to setup
          router.push("/profile/setup");
        } else {
          // Profile complete, go to dashboard
          router.push("/dashboard");
        }
        return;
      }

      // No session found
      setStatus("error");
      setErrorMessage(
        "No valid session found. Please try the invitation link again."
      );
    };

    handleInviteAuth();
  }, [router, searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd]">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <AnimatePresence mode="wait">
        {status === "error" ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative z-10 mx-auto w-full max-w-sm px-4 text-center"
          >
            <div className="rounded-xl border border-zinc-800/50 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-xl">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <h1 className="mb-2 text-xl font-bold text-white">
                Invitation Error
              </h1>
              <p className="mb-6 text-sm text-zinc-400">{errorMessage}</p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-[#ff78c8] text-white transition-all duration-300 hover:bg-[#ff60b8] hover:shadow-lg hover:shadow-[#ff78c8]/25"
              >
                Go to Login
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 text-center"
          >
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#ff78c8]/30 border-t-[#ff78c8]"></div>
            <p className="mt-4 text-sm font-medium text-white/70">
              {status === "redirecting"
                ? "Redirecting you..."
                : "Processing your invitation..."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd]">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#ff78c8]/30 border-t-[#ff78c8]"></div>
            <p className="mt-4 text-sm font-medium text-white/70">
              Loading invitation...
            </p>
          </div>
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
