"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { Loader2, AlertCircle, X } from "lucide-react";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const router = useRouter();

  // Validate that user came from reset link
  useEffect(() => {
    const validateAccess = async () => {
      const supabase = createClient();

      // Check if there's a recovery token in URL
      if (
        typeof window !== "undefined" &&
        window.location.hash.includes("access_token")
      ) {
        // Wait for Supabase to process the token
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Check if user is authenticated
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Not authenticated, redirect to login
        router.push("/login");
        return;
      }

      setIsValidating(false);
    };

    validateAccess();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Update user password
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });

      if (passwordError) {
        setError(
          passwordError.message ||
            "Failed to update password. Please try again."
        );
        return;
      }

      // Success! Redirect to dashboard
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="relative z-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-400" />
          <p className="mt-4 text-zinc-400">Validating access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Reset password form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-zinc-800/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <CardTitle className="mb-2 text-3xl font-bold text-white">
                Reset Password
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Enter your new password below
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: 0 }}
                  animate={{
                    opacity: 1,
                    x: [0, -10, 10, -10, 10, 0],
                  }}
                  transition={{
                    x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                    opacity: { duration: 0.2 },
                  }}
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-400"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="mt-0.5 flex-shrink-0 text-red-400 transition-colors hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              )}

              <div className="space-y-4">
                <PasswordInput
                  password={password}
                  confirmPassword={confirmPassword}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="group relative w-full overflow-hidden rounded-lg bg-[#ff78c8] py-6 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff60b8] hover:shadow-xl hover:shadow-[#ff78c8]/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
