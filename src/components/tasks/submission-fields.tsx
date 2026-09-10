"use client";

import { useRef, useState } from "react";
import { FileText, ImageIcon, Link2, Paperclip, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface ExternalUrl {
  url: string;
  title: string;
  type: string;
}

export function detectUrlType(url: string): string {
  if (url.includes("docs.google.com/spreadsheets")) return "google_sheets";
  if (url.includes("docs.google.com/document")) return "google_docs";
  if (url.includes("github.com")) return "github";
  if (url.includes("figma.com")) return "figma";
  if (url.includes("notion.so")) return "notion";
  return "external";
}

const TYPE_LABEL: Record<string, string> = {
  google_sheets: "Sheets",
  google_docs: "Docs",
  github: "GitHub",
  figma: "Figma",
  notion: "Notion",
  external: "Link",
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Label + optional required mark + optional inline error, shared by fields. */
export function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id?: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-1">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

/** URL input with Enter/Add, listing added links as removable chips. */
export function UrlListField({
  label,
  placeholder,
  required,
  urls,
  onChange,
  error,
  disabled,
}: {
  label: string;
  placeholder?: string;
  required?: boolean;
  urls: ExternalUrl[];
  onChange: (urls: ExternalUrl[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [current, setCurrent] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const add = () => {
    const value = current.trim();
    if (!value) return;
    try {
      new URL(value);
    } catch {
      setLocalError("That doesn't look like a full link. Include https://");
      return;
    }
    onChange([
      ...urls,
      {
        url: value,
        title: value.split("/").pop() || "External Resource",
        type: detectUrlType(value),
      },
    ]);
    setCurrent("");
    setLocalError(null);
  };

  return (
    <FieldShell
      label={label}
      required={required}
      error={localError ?? error}
      hint="Paste a link and press Enter. Public links only."
    >
      <div className="flex gap-2">
        <Input
          placeholder={placeholder ?? "https://…"}
          value={current}
          disabled={disabled}
          onChange={(e) => {
            setCurrent(e.target.value);
            if (localError) setLocalError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          className={cn(localError && "border-red-500")}
        />
        <Button
          type="button"
          variant="outline"
          onClick={add}
          disabled={disabled || !current.trim()}
        >
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>
      {urls.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {urls.map((item, index) => (
            <li
              key={`${item.url}-${index}`}
              className="bg-muted/40 flex items-center gap-2 rounded-lg py-1.5 pr-1.5 pl-3 text-sm"
            >
              <Link2 className="text-primary h-3.5 w-3.5 shrink-0" />
              <span className="text-muted-foreground shrink-0 text-xs">
                {TYPE_LABEL[item.type] ?? "Link"}
              </span>
              <span className="min-w-0 flex-1 truncate" title={item.url}>
                {hostOf(item.url)}
                <span className="text-muted-foreground">
                  {item.url.replace(/^https?:\/\/[^/]+/, "")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onChange(urls.filter((_, i) => i !== index))}
                disabled={disabled}
                aria-label="Remove link"
                className="hover:bg-background text-muted-foreground hover:text-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </FieldShell>
  );
}

function formatSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** "Add files" button + chip list; the native input stays hidden. */
export function FileListField({
  id,
  label,
  accept,
  multiple,
  required,
  files,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  files: File[];
  onChange: (files: File[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <FieldShell
      label={label}
      required={required}
      error={error}
      hint={accept ? `Accepted: ${accept.replace(/,/g, ", ")}` : undefined}
    >
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
          Add files
        </Button>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            onChange([...files, ...Array.from(e.target.files ?? [])]);
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
                  {formatSize(file.size)}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
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
    </FieldShell>
  );
}
