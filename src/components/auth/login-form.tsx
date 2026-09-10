"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Notice = { kind: "error" | "success"; text: string } | null;

/** Email + password sign-in with the "forgot password" reset link. */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resetCooldown, setResetCooldown] = useState(0);

  useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setTimeout(() => setResetCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resetCooldown]);

  const validateEmail = (value: string) => {
    if (!value) return setEmailError(null);
    setEmailError(
      EMAIL_RE.test(value) ? null : "That email doesn't look right."
    );
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        posthog.capture("user_login_failed", {
          error_message: error.message,
          email,
        });
        if (/banned/i.test(error.message)) {
          // Account belongs to a closed cohort batch (see close_batch_v1).
          setNotice({
            kind: "error",
            text: "This account belongs to a completed programme batch and is no longer active. Contact StartSchool if you need something.",
          });
        } else if (error.message.includes("Invalid login credentials")) {
          setNotice({
            kind: "error",
            text: "Wrong email or password. If you were invited but never finished setup, ask an admin to resend your invitation.",
          });
        } else {
          setNotice({ kind: "error", text: error.message });
        }
        setLoading(false);
        return;
      }
      posthog.capture("user_login_success", { email });
      router.push("/dashboard");
    } catch {
      setNotice({ kind: "error", text: "Something went wrong. Try again." });
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setNotice({
        kind: "error",
        text: "Type your email above first, then we'll send the reset link.",
      });
      return;
    }
    if (resetCooldown > 0) return;
    setLoading(true);
    setNotice(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        setNotice({ kind: "error", text: error.message });
      } else {
        posthog.capture("password_reset_requested", { email });
        setNotice({
          kind: "success",
          text: `Reset link sent to ${email}. Check your inbox.`,
        });
        setResetCooldown(60);
      }
    } catch {
      setNotice({ kind: "error", text: "Couldn't send the reset email." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="flex flex-col gap-5" noValidate>
      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
            notice.kind === "error"
              ? "bg-red-500/5 text-red-700 dark:text-red-400"
              : "bg-green-500/10 text-green-700 dark:text-green-400"
          )}
        >
          {notice.kind === "error" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@startschool.org"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) validateEmail(e.target.value);
          }}
          onBlur={(e) => validateEmail(e.target.value)}
          disabled={loading}
          required
          className={cn("h-10", emailError && "border-red-500")}
        />
        {emailError && (
          <p className="text-xs text-red-600 dark:text-red-400">{emailError}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <button
            type="button"
            onClick={handleReset}
            disabled={loading || resetCooldown > 0}
            className="text-muted-foreground hover:text-primary text-xs transition-colors disabled:opacity-60"
          >
            {resetCooldown > 0
              ? `Sent · wait ${resetCooldown}s`
              : "Forgot password?"}
          </button>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
          required
          className="h-10"
        />
      </div>

      <Button type="submit" disabled={loading} className="h-10 w-full">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
