"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

  if (status === "processing") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff78c8] mx-auto"></div>
          <p className="mt-4 text-gray-600">Processing your invitation...</p>
        </div>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Invitation Error
          </h1>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          <button
            onClick={() => router.push("/login")}
            className="bg-[#ff78c8] text-white px-6 py-2 rounded-md hover:bg-[#ff78c8]/90 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff78c8] mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invitation...</p>
          </div>
        </div>
      }
    >
      <InviteAcceptContent />
    </Suspense>
  );
}
