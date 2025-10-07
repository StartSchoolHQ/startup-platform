"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

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
        setError(error.message);
      } else {
        // Check if user profile exists and is complete
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
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
              setError("Failed to create user profile. Please try again.");
              return;
            }
            // Redirect to profile setup
            router.push("/profile/setup");
            router.refresh();
          } else if (profileError) {
            setError("Failed to load user profile. Please try again.");
          } else if (!userProfile.name || !userProfile.avatar_url) {
            // Profile exists but is incomplete
            router.push("/profile/setup");
            router.refresh();
          } else {
            // Profile is complete, go to dashboard
            router.push("/dashboard");
            router.refresh();
          }
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 bg-[#09090b]">
      {/* Grid background - always dark theme styling */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgb(255_255_255/0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"
          animate={{
            y: [0, -20, 0],
            x: [0, 10, 0],
          }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-400/5 rounded-full blur-3xl"
          animate={{
            y: [0, 20, 0],
            x: [0, -15, 0],
          }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Floating particles */}
      {isClient && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Login form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-zinc-800/50 bg-zinc-900/80 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center pb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-purple-500 to-purple-600 bg-clip-text text-transparent">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-zinc-400 mt-2">
                Sign in to continue building your startup
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSignIn} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-zinc-200"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-2"
              >
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-200"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-400 focus:border-purple-500 focus:ring-purple-500/20 transition-all duration-200"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full group relative overflow-hidden bg-purple-600 hover:bg-purple-700 text-white py-6 text-base font-semibold rounded-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-600/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="relative z-10">
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
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-center"
            >
              <p className="text-sm text-zinc-400">
                Don&apos;t have an account?{" "}
                <span className="text-purple-400 hover:text-purple-300 cursor-pointer transition-colors">
                  Sign up
                </span>
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
