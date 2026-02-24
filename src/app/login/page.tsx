"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resetCooldown, setResetCooldown] = useState(0);
  const router = useRouter();

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError(null);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(
      emailRegex.test(value) ? null : "Please enter a valid email address"
    );
  };

  useEffect(() => {
    if (resetCooldown > 0) {
      const timer = setTimeout(() => setResetCooldown(resetCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resetCooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Track failed login attempt
        posthog.capture("user_login_failed", {
          error_message: error.message,
          email: email,
        });

        // Check if this is an incomplete profile trying to login
        if (error.message.includes("Invalid login credentials")) {
          // Try to check if user exists with incomplete profile
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user && email) {
            // Check if this email has pending invitation
            setError(
              "Invalid credentials. If you were invited but haven't completed setup, please contact an admin to resend your invitation link."
            );
          } else {
            setError(error.message);
          }
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else {
        // Track successful login
        posthog.capture("user_login_success", {
          email: email,
        });

        // Successfully authenticated - let dashboard handle profile checks
        router.push("/dashboard");
      }
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4">
      {/* Grid background - always dark theme styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Login form */}
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
              <CardTitle className="text-2xl font-bold text-[#ff78c8]">
                Welcome Back
              </CardTitle>
              <CardDescription className="mt-2 text-zinc-400">
                Sign in to continue building your startup
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSignIn} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: 0 }}
                  animate={{
                    opacity: 1,
                    x: [0, -10, 10, -10, 10, 0],
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{
                    x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                    opacity: { duration: 0.2 },
                  }}
                  className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-400"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  </motion.div>
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

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-zinc-100"
                >
                  Email
                </Label>
                <motion.div
                  animate={loading ? { opacity: 0.5 } : { opacity: 1 }}
                  whileFocus={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                    disabled={loading}
                    required
                    className={`border-zinc-600 bg-zinc-800 text-zinc-100 transition-all duration-200 placeholder:text-zinc-400 focus:border-[#ff78c8] focus:bg-zinc-700/50 focus:ring-[#ff78c8]/30 ${emailError ? "border-red-500/60" : ""}`}
                  />
                </motion.div>
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-red-400"
                  >
                    {emailError}
                  </motion.p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-100"
                >
                  Password
                </Label>
                <motion.div
                  animate={loading ? { opacity: 0.5 } : { opacity: 1 }}
                  whileFocus={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="border-zinc-600 bg-zinc-800 text-zinc-100 transition-all duration-200 placeholder:text-zinc-400 focus:border-[#ff78c8] focus:bg-zinc-700/50 focus:ring-[#ff78c8]/30"
                  />
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <motion.div
                  animate={loading ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={
                    loading
                      ? { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
                      : {}
                  }
                >
                  <Button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full overflow-hidden rounded-lg bg-[#ff78c8] py-6 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff60b8] hover:shadow-xl hover:shadow-[#ff78c8]/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                      {loading ? "Signing in..." : "Sign In"}
                    </span>
                    {!loading && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6, ease: "easeInOut" }}
                      />
                    )}
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="space-y-2 text-center"
              >
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError("Please enter your email address");
                      return;
                    }
                    if (resetCooldown > 0) {
                      setError(
                        `Please wait ${resetCooldown} seconds before requesting another reset`
                      );
                      return;
                    }
                    setLoading(true);
                    setError(null);
                    try {
                      const supabase = createClient();
                      const { error } =
                        await supabase.auth.resetPasswordForEmail(email);
                      if (error) {
                        setError(error.message);
                      } else {
                        // Track password reset request
                        posthog.capture("password_reset_requested", {
                          email: email,
                        });
                        setError(
                          "Password reset email sent! Check your inbox."
                        );
                        setResetCooldown(60); // 60 second cooldown
                      }
                    } catch {
                      setError("Failed to send reset email");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading || resetCooldown > 0}
                  className="text-sm text-zinc-300 underline-offset-4 transition-colors duration-200 hover:text-[#ff78c8] hover:underline disabled:opacity-50"
                >
                  {resetCooldown > 0
                    ? `Wait ${resetCooldown}s`
                    : "Forgot password?"}
                </button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
