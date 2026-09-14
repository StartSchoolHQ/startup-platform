"use client";

import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReportDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eyebrow: string;
  title: string;
  description: string;
  chip?: ReactNode;
  formId: string;
  onSubmit: (e: React.FormEvent) => void;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * The weekly-report dialog skeleton both forms share: fixed header with a
 * primary eyebrow, a body that scrolls on its own, and a fixed footer — the
 * same bones as the task submission modal.
 */
export function ReportDialogShell({
  open,
  onOpenChange,
  eyebrow,
  title,
  description,
  chip,
  formId,
  onSubmit,
  footer,
  children,
}: ReportDialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="space-y-1.5 px-6 pt-6 pb-5 text-left">
          <div className="flex items-center justify-between gap-3 pr-6">
            <p className="text-primary text-xs font-medium">{eyebrow}</p>
            {chip}
          </div>
          <DialogTitle className="text-xl leading-snug font-semibold tracking-tight">
            {title}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={onSubmit}
          className="min-h-0 flex-1 overflow-y-auto border-t px-6 py-6"
        >
          {children}
        </form>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between sm:gap-2">
          {footer}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small muted chip for the header's right side ("Draft restored"). */
export function HeaderChip({ children }: { children: ReactNode }) {
  return (
    <span className="bg-muted text-muted-foreground shrink-0 rounded-full px-2.5 py-0.5 text-xs">
      {children}
    </span>
  );
}
