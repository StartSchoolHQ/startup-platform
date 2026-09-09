import { Link as LinkIcon } from "lucide-react";
import type { NormalizedSubmission } from "@/lib/ai-review/types";

function isImageFile(name: string, type: string | null): boolean {
  if (type?.startsWith("image/")) return true;
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SubmissionSection({
  submission,
}: {
  submission: NormalizedSubmission;
}) {
  const hasContent =
    submission.description ||
    submission.links.length ||
    submission.files.length;

  if (!hasContent) {
    return (
      <p className="text-muted-foreground text-sm">
        No submission data available
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {submission.description && (
        <div className="bg-muted/30 rounded-lg border p-3">
          <p className="text-sm whitespace-pre-wrap">
            {submission.description}
          </p>
        </div>
      )}

      {submission.files.length > 0 && (
        <div>
          <span className="text-muted-foreground mb-2 block text-xs font-medium">
            Attached Files
          </span>
          <div className="space-y-2">
            {submission.files.map((file, index) => {
              const image = isImageFile(file.name, file.type);
              return (
                <div key={`${file.url}-${index}`} className="space-y-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:text-blue-800"
                  >
                    📎 {file.name} ({formatBytes(file.size)})
                  </a>
                  {image && (
                    <div className="rounded-lg border bg-white p-2 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.url}
                        alt={file.name}
                        className="max-h-72 w-full rounded border object-contain"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {submission.links.length > 0 && (
        <div>
          <span className="text-muted-foreground mb-2 block text-xs font-medium">
            Links
          </span>
          <div className="space-y-2">
            {submission.links.map((link, index) => (
              <div
                key={`${link.url}-${index}`}
                className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-3"
              >
                <div className="mb-1 flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {link.title || "Link"}
                  </span>
                </div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm break-all text-blue-600 underline hover:text-blue-800"
                >
                  {link.url}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
