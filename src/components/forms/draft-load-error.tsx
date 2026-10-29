import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shown in place of a draft-backed form when this open's draft read failed.
 * The form is not rendered (and autosave stays off) so an empty or stale
 * form can never overwrite the real draft.
 */
export function DraftLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/5 text-destructive flex flex-col items-start gap-3 rounded-md border p-4 text-sm"
    >
      Couldn&apos;t load your saved draft. Check your connection and reopen.
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RotateCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}
