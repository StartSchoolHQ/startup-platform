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
import {
  BACKGROUND_FIELD,
  BACKGROUND_SECTION,
  BIO_FIELDS,
  BIO_SECTION,
  LEANS,
  type FounderCardField as Field,
} from "./founder-card-copy";
import { SETUP_INPUT_CLASS, SETUP_SUBMIT_CLASS } from "./setup-shell";

/**
 * Where the form is rendered: the dark setup shell after first sign-in, or
 * the light Account page where the card is edited later. Same fields, same
 * validation, same upsert — only the skin and the button differ.
 */
type Appearance = "setup" | "account";

const SKIN = {
  setup: {
    intro: "border-zinc-800",
    title: "text-zinc-50",
    text: "text-zinc-400",
    label: "text-zinc-100",
    hint: "text-zinc-500",
    input: SETUP_INPUT_CLASS,
    leanOn: "border-[#ff78c8] bg-[#ff78c8]/10 text-zinc-50",
    leanOff:
      "border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500",
    leanHint: "text-zinc-500",
    error: "text-red-400",
  },
  account: {
    intro: "border-border",
    title: "",
    text: "text-muted-foreground",
    label: "",
    hint: "text-muted-foreground",
    input: "",
    leanOn: "border-primary bg-primary/10",
    leanOff:
      "border-border bg-muted/40 text-muted-foreground hover:border-primary/50",
    leanHint: "text-muted-foreground",
    error: "text-red-600 dark:text-red-400",
  },
} as const;

/** Section heading + one-line intro, copied from the former Phase 0 tasks. */
function SectionIntro({
  title,
  intro,
  skin,
}: {
  title: string;
  intro: string;
  skin: (typeof SKIN)[Appearance];
}) {
  return (
    <div
      className={cn(
        "space-y-1 border-t pt-5 first:border-t-0 first:pt-0",
        skin.intro
      )}
    >
      <h3 className={cn("text-base font-semibold", skin.title)}>{title}</h3>
      <p className={cn("text-sm", skin.text)}>{intro}</p>
    </div>
  );
}

/**
 * The founder card (background lean + short bio). Step 2 of profile setup,
 * and — with `initial` and `appearance="account"` — the editable card on
 * the Account page.
 */
export function FounderCardForm({
  onError,
  onDone,
  initial = null,
  appearance = "setup",
  submitLabel = "Finish setup",
}: {
  onError: (message: string | null) => void;
  onDone: () => void;
  /** Saved answers to pre-fill; null for a first-time card. */
  initial?: FounderCardInput | null;
  appearance?: Appearance;
  submitLabel?: string;
}) {
  const skin = SKIN[appearance];
  const [lean, setLean] = useState<BackgroundLean | null>(
    initial?.background_lean ?? null
  );
  const [values, setValues] = useState<Record<Field, string>>({
    background_reason: initial?.background_reason ?? "",
    bio_energizes: initial?.bio_energizes ?? "",
    bio_skills: initial?.bio_skills ?? "",
    bio_gaps: initial?.bio_gaps ?? "",
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
      posthog.capture(
        initial ? "founder_card_updated" : "founder_card_completed",
        { lean: parsed.data.background_lean }
      );
      onDone();
    } catch {
      onError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (f: typeof BACKGROUND_FIELD) => (
    <div key={f.key} className="space-y-2">
      <Label htmlFor={f.key} className={cn("text-sm font-medium", skin.label)}>
        {f.label}
      </Label>
      <Textarea
        id={f.key}
        rows={f.rows}
        value={values[f.key]}
        onChange={(e) => setValue(f.key, e.target.value)}
        placeholder={f.placeholder}
        disabled={loading}
        className={cn(skin.input, fieldErrors[f.key] && "border-red-500")}
      />
      {fieldErrors[f.key] && (
        <p className={cn("text-xs", skin.error)}>{fieldErrors[f.key]}</p>
      )}
    </div>
  );

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <SectionIntro
        title={BACKGROUND_SECTION.title}
        intro={BACKGROUND_SECTION.intro}
        skin={skin}
      />

      <div className="space-y-2">
        <Label className={cn("text-sm font-medium", skin.label)}>
          {BACKGROUND_SECTION.leanLabel}
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
                lean === opt.value ? skin.leanOn : skin.leanOff
              )}
            >
              <span className="block text-sm font-semibold">{opt.label}</span>
              <span className={cn("mt-0.5 block text-xs", skin.leanHint)}>
                {opt.hint}
              </span>
            </button>
          ))}
        </div>
        <p className={cn("text-xs", skin.hint)}>
          {BACKGROUND_SECTION.leanHint}
        </p>
      </div>

      {renderField(BACKGROUND_FIELD)}

      <SectionIntro
        title={BIO_SECTION.title}
        intro={BIO_SECTION.intro}
        skin={skin}
      />

      {BIO_FIELDS.map(renderField)}
      <p className={cn("text-xs", skin.hint)}>{BIO_SECTION.footer}</p>

      {appearance === "setup" ? (
        <Button type="submit" disabled={loading} className={SETUP_SUBMIT_CLASS}>
          <span className="relative z-10 flex items-center justify-center gap-2">
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {loading ? "Saving…" : submitLabel}
          </span>
        </Button>
      ) : (
        <div className="flex justify-end border-t pt-5">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Saving…" : submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}
