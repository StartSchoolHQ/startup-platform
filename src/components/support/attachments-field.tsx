"use client";

import { useRef } from "react";
import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  ALLOWED_FILE_TYPES,
  MAX_FILE_SIZE,
  MAX_FILES,
  formatFileSize,
} from "@/lib/support/attachment-rules";

export { ALLOWED_FILE_TYPES, MAX_FILE_SIZE, MAX_FILES };

/**
 * Validates a new selection against the current list. Returns the files to
 * add, or an error message to show inline.
 */
export function validateAttachments(
  incoming: File[],
  current: File[]
): { files: File[] } | { error: string } {
  if (incoming.length + current.length > MAX_FILES) {
    return { error: `You can attach up to ${MAX_FILES} files.` };
  }
  for (const file of incoming) {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return {
        error: `"${file.name}" isn't a supported type. Use images, PDF, Word, Excel, TXT, CSV or LOG files.`,
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return {
        error: `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)}MB — the limit is 8MB per file.`,
      };
    }
  }
  return { files: incoming };
}

/** "Add files" button + chip list. The native input stays hidden. */
export function AttachmentsField({
  files,
  onAdd,
  onRemove,
  disabled,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const full = files.length >= MAX_FILES;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || full}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Add files
        </Button>
        <span className="text-muted-foreground text-xs">
          Up to {MAX_FILES} files, 8MB each. Screenshots help most.
        </span>
        <input
          ref={inputRef}
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          accept="image/*,.txt,.csv,.log,.pdf,.doc,.docx,.xls,.xlsx"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {files.map((file, index) => {
            const Icon = file.type.startsWith("image/") ? ImageIcon : FileText;
            return (
              <li
                key={`${file.name}-${index}`}
                className="bg-muted/60 flex items-center gap-2 rounded-full py-1 pr-1 pl-3 text-xs"
              >
                <Icon className="text-primary h-3.5 w-3.5 shrink-0" />
                <span className="max-w-[180px] truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  {formatFileSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  className="hover:bg-background text-muted-foreground hover:text-foreground flex h-5 w-5 items-center justify-center rounded-full transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
