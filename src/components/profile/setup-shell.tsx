"use client";

import { motion } from "framer-motion";
import { AlertCircle, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CANVAS =
  "relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0000dd] p-4";
const GRID =
  "absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:24px_24px]";

export function SetupLoading() {
  return (
    <div className={CANVAS}>
      <div className={GRID} />
      <div className="relative z-10 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#ff78c8]/30 border-t-[#ff78c8]" />
        <p className="mt-4 text-sm font-medium text-white/70">
          Validating access...
        </p>
      </div>
    </div>
  );
}

/** Blue-canvas card used by both profile setup steps. */
export function SetupShell({
  step,
  title,
  description,
  error,
  onDismissError,
  children,
}: {
  step: 1 | 2;
  title: string;
  description: string;
  error: string | null;
  onDismissError: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={CANVAS}>
      <div className={GRID} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-zinc-800/50 bg-zinc-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="pb-6 text-center">
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Step {step} of 2
            </p>
            <CardTitle className="text-2xl font-bold text-[#ff78c8]">
              {title}
            </CardTitle>
            <CardDescription className="mt-2 text-zinc-400">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: 0 }}
                animate={{ opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                transition={{
                  x: { duration: 0.4, times: [0, 0.2, 0.4, 0.6, 0.8, 1] },
                  opacity: { duration: 0.2 },
                }}
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/20 px-4 py-3 text-sm text-red-400"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={onDismissError}
                  aria-label="Dismiss"
                  className="mt-0.5 flex-shrink-0 text-red-400 transition-colors hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
            {children}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export const SETUP_INPUT_CLASS =
  "border-zinc-600 bg-zinc-800 text-zinc-100 transition-all duration-200 placeholder:text-zinc-400 focus:border-[#ff78c8] focus:bg-zinc-700/50 focus:ring-[#ff78c8]/30";

export const SETUP_SUBMIT_CLASS =
  "group relative w-full overflow-hidden rounded-lg bg-[#ff78c8] py-6 text-base font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:bg-[#ff60b8] hover:shadow-xl hover:shadow-[#ff78c8]/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100";
