"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  FounderCardSchema,
  type BackgroundLean,
  type FounderCardInput,
} from "@/lib/validation-schemas";
import { SETUP_INPUT_CLASS, SETUP_SUBMIT_CLASS } from "./setup-shell";

const LEANS: { value: BackgroundLean; label: string; hint: string }[] = [
  { value: "tech", label: "Tech", hint: "Building, engineering, product" },
  { value: "business", label: "Business", hint: "Market, sales, operations" },
  { value: "both", label: "Both", hint: "Genuinely split — say why" },
];

type Field = Exclude<keyof FounderCardInput, "background_lean">;

const FIELDS: {
  key: Field;
  label: string;
  placeholder: string;
  rows: number;
}[] = [
  {
    key: "background_reason",
    label: "Why that lean? *",
    placeholder:
      "One or two honest sentences on where your energy and confidence sit today — not where you think they should be.",
    rows: 3,
  },
  {
    key: "bio_energizes",
    label: "What energizes you *",
    placeholder: "The kind of work you'd do on a Sunday without being asked.",
    rows: 3,
  },
  {
    key: "bio_skills",
    label: "Skills you already bring *",
    placeholder:
      'Specific beats generic: "built two Shopify stores" beats "good with people".',
    rows: 3,
  },
  {
    key: "bio_gaps",
    label: "What a co-founder should cover *",
    placeholder:
      "At least one real gap. This is for team matching, not a pitch.",
    rows: 3,
  },
];

/** Step 2 of profile setup: the founder card (background lean + short bio). */
export function FounderCardForm({
  onError,
  onDone,
}: {
  onError: (message: string | null) => void;
  onDone: () => void;
}) {
  const [lean, setLean] = useState<BackgroundLean | null>(null);
  const [values, setValues] = useState<Record<Field, string>>({
    background_reason: "",
    bio_energizes: "",
    bio_skills: "",
    bio_gaps: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<Field, string>>
  >({});
  const [loading, setLoading] = useState(false);

  const setValue = (key: Field, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onError(null);
    const parsed = FounderCardSchema.safeParse({
      background_lean: lean,
      ...values,
    });
    if (!parsed.success) {
      const errs: Partial<Record<Field, string>> = {};
      let leanError: string | null = null;
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FounderCardInput;
        if (key === "background_lean") leanError = "Pick one of the three.";
        else errs[key] = issue.message;
      }
      setFieldErrors(errs);
      if (leanError) onError(leanError);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        onError("Authentication error. Please sign in again.");
        return;
      }
      const { error } = await supabase
        .from("founder_profiles")
        .upsert(
          { user_id: user.id, ...parsed.data },
          { onConflict: "user_id" }
        );
      if (error) {
        onError(`Couldn't save your founder card: ${error.message}`);
        return;
      }
      posthog.capture("founder_card_completed", {
        lean: parsed.data.background_lean,
      });
      onDone();
    } catch {
      onError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-zinc-100">
          Where do you lean today? *
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {LEANS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLean(opt.value)}
              disabled={loading}
              aria-pressed={lean === opt.value}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-colors",
                lean === opt.value
                  ? "border-[#ff78c8] bg-[#ff78c8]/10 text-zinc-50"
                  : "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500"
              )}
            >
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-500">
          There is no wrong answer and it is expected to change. A team needs
          both.
        </p>
      </div>

      {FIELDS.map((f) => (
        <div key={f.key} className="space-y-2">
          <Label htmlFor={f.key} className="text-sm font-medium text-zinc-100">
            {f.label}
          </Label>
          <Textarea
            id={f.key}
            rows={f.rows}
            value={values[f.key]}
            onChange={(e) => setValue(f.key, e.target.value)}
            placeholder={f.placeholder}
            disabled={loading}
            className={cn(
              SETUP_INPUT_CLASS,
              fieldErrors[f.key] && "border-red-500"
            )}
          />
          {fieldErrors[f.key] && (
            <p className="text-xs text-red-400">{fieldErrors[f.key]}</p>
          )}
        </div>
      ))}

      <Button type="submit" disabled={loading} className={SETUP_SUBMIT_CLASS}>
        <span className="relative z-10 flex items-center justify-center gap-2">
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {loading ? "Saving…" : "Finish setup"}
        </span>
      </Button>
    </form>
  );
}
