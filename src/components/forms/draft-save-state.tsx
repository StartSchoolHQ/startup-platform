import type { DraftSaveStatus } from "@/hooks/use-autosave-draft";
import { DRAFT_SAVE_FALLBACK } from "@/lib/drafts/save-error";
import { cn } from "@/lib/utils";

const TEXT: Record<Exclude<DraftSaveStatus, "error">, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
};

/**
 * Quiet autosave status line for draft-backed forms. Renders props only.
 * The live region stays mounted (empty when idle) so screen readers announce
 * each status change.
 */
export function DraftSaveState({
  status,
  errorMessage,
  className,
}: {
  status: DraftSaveStatus;
  errorMessage?: string | null;
  className?: string;
}) {
  const text =
    status === "error" ? (errorMessage ?? DRAFT_SAVE_FALLBACK) : TEXT[status];
  return (
    <p
      aria-live="polite"
      className={cn(
        "text-xs",
        status === "error" ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {text}
    </p>
  );
}
