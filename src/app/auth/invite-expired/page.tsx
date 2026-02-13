"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Mail } from "lucide-react";

function InviteExpiredContent() {
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const error = searchParams.get("error");
    setErrorMessage(error || "");
  }, [searchParams]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000ff] p-4">
      {/* Grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-[#ff78c8]/10 blur-3xl"
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
          className="absolute top-3/4 right-1/4 h-96 w-96 rounded-full bg-[#ff78c8]/5 blur-3xl"
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
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {[...Array(15)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute h-1 w-1 rounded-full bg-[#ff78c8]/30"
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

      {/* Error card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-zinc-800/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-[#ff78c8]">
                Invitation Link Expired
              </CardTitle>
              <CardDescription className="mt-2 text-zinc-400">
                This invitation link is no longer valid
              </CardDescription>
            </motion.div>
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="rounded-lg border border-zinc-700/50 bg-zinc-800/50 p-4 text-sm"
            >
              <p className="mb-2 font-medium text-zinc-200">What happened?</p>
              <p className="text-zinc-400">Your invitation link has either:</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-zinc-400">
                <li>Already been used</li>
                <li>Expired (links are valid for 24 hours)</li>
                <li>Been invalidated</li>
              </ul>
            </motion.div>

            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm"
              >
                <p className="text-red-400">
                  <strong>Technical details:</strong> {errorMessage}
                </p>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="rounded-lg border border-[#ff78c8]/20 bg-[#ff78c8]/10 p-4"
            >
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-[#ff78c8]" />
                <div className="text-sm">
                  <p className="mb-1 font-medium text-zinc-200">
                    What to do next:
                  </p>
                  <p className="mb-2 text-zinc-300">
                    You can complete your setup using the "Forgot password?"
                    button on the login page. This will send you a new link to
                    set your password and finish profile setup.
                  </p>
                  <p className="text-zinc-300">
                    Alternatively, contact an administrator to resend your
                    invitation.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="pt-4"
            >
              <Button
                className="group relative w-full overflow-hidden rounded-lg bg-[#ff78c8] py-6 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff60b8] hover:shadow-xl hover:shadow-[#ff78c8]/25"
                onClick={() => (window.location.href = "/login")}
              >
                <span className="relative z-10">Go to Login</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                />
              </Button>
              <p className="mt-3 text-center text-sm text-zinc-400">
                Already have an account?{" "}
                <a href="/login" className="text-[#ff78c8] hover:underline">
                  Sign in here
                </a>
              </p>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function InviteExpiredPage() {
  return (
    <Suspense
      fallback={
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000ff] p-4">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <Card className="relative z-10 w-full max-w-md border-zinc-800/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-[#ff78c8]">
                Loading...
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <InviteExpiredContent />
    </Suspense>
  );
}
