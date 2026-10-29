import type { DraftSaveStatus } from "@/hooks/use-autosave-draft";
import { cn } from "@/lib/utils";

const FALLBACK_ERROR = "Not saved, check your connection";

function savedLabel(savedAt: Date | null) {
  if (!savedAt) return "Saved";
  const minutes = Math.floor((Date.now() - savedAt.getTime()) / 60_000);
  if (minutes < 1) return "Saved";
  if (minutes < 60) return `Saved · ${minutes} min ago`;
  return `Saved · ${Math.floor(minutes / 60)} h ago`;
}

/** Quiet autosave status line for draft-backed forms. Renders props only. */
export function DraftSaveState({
  status,
  savedAt,
  errorMessage,
  className,
}: {
  status: DraftSaveStatus;
  savedAt: Date | null;
  errorMessage?: string | null;
  className?: string;
}) {
  if (status === "idle") return null;
  const text =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? savedLabel(savedAt)
        : (errorMessage ?? FALLBACK_ERROR);
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
