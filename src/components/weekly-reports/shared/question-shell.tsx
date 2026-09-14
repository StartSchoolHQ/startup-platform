import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Container for a list of numbered questions: a thin rail runs behind the
 * numerals so the form reads as a sequence to walk through, top to bottom.
 */
export function QuestionList({ children }: { children: ReactNode }) {
  return (
    <ol className="before:bg-border/80 relative space-y-8 before:absolute before:top-4 before:bottom-4 before:left-[13px] before:w-px">
      {children}
    </ol>
  );
}

/**
 * One question: numeral on the rail, the question as the label, an optional
 * hint, the field(s), and an inline error line. `id` lets the form scroll the
 * first failing question into view.
 */
export function QuestionShell({
  id,
  number,
  title,
  hint,
  optional,
  error,
  htmlFor,
  children,
}: {
  id: string;
  number: number;
  title: string;
  hint?: string;
  optional?: boolean;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <li id={id} className="relative pl-11">
      <span
        aria-hidden
        className={cn(
          "ring-background absolute top-0 left-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums ring-4",
          error ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"
        )}
      >
        {number}
      </span>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor={htmlFor} className="text-sm leading-snug font-medium">
            {title}
            {optional && (
              <span className="text-muted-foreground font-normal">
                {" "}
                (optional)
              </span>
            )}
          </Label>
          {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
        {children}
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </li>
  );
}
