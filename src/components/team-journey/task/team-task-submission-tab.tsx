import { ExternalLink, FileText, PackageCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TaskSectionTitle } from "@/components/tasks/task-content-lists";
import { formatDate } from "@/lib/date-utils";
import type { TeamTask } from "@/types/team-journey";

type UrlItem = string | { url: string; title?: string; type?: string };

export function hasSubmission(task: TeamTask | null): boolean {
  return (
    !!task?.submission_data && Object.keys(task.submission_data).length > 0
  );
}

/** What the member delivered: text, links and files, as stored. */
export function TeamTaskSubmissionTab({ task }: { task: TeamTask }) {
  const data = task.submission_data ?? {};
  const description =
    typeof data.description === "string" ? data.description : "";
  const urls = Array.isArray(data.external_urls)
    ? (data.external_urls as UrlItem[])
    : [];
  const files = Array.isArray(data.files) ? (data.files as string[]) : [];
  const submittedAt =
    typeof data.submitted_at === "string" ? data.submitted_at : null;

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <TaskSectionTitle icon={PackageCheck}>Submission</TaskSectionTitle>

        {description && (
          <p className="-mt-4 text-sm leading-relaxed whitespace-pre-wrap">
            {description}
          </p>
        )}

        {urls.length > 0 && (
          <section className="space-y-2">
            <p className="text-muted-foreground text-xs font-medium">Links</p>
            {urls.map((item, index) => {
              const url = typeof item === "string" ? item : item.url;
              const title =
                typeof item === "string" ? item : item.title || item.url;
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:bg-muted/50 flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors"
                >
                  <ExternalLink className="text-primary h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{title}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {url}
                    </span>
                  </span>
                </a>
              );
            })}
          </section>
        )}

        {files.length > 0 && (
          <section className="space-y-3">
            <p className="text-muted-foreground text-xs font-medium">Files</p>
            {files.map((fileUrl, index) => {
              const name = fileUrl.split("/").pop() || `File ${index + 1}`;
              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name);
              return (
                <div key={index} className="space-y-2">
                  <a
                    href={fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary flex items-center gap-2 text-sm hover:underline"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    {name}
                  </a>
                  {isImage && (
                    <div className="bg-muted/30 rounded-lg border p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl}
                        alt={name}
                        className="max-h-80 w-full rounded object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {submittedAt && (
          <p className="text-muted-foreground border-t pt-3 text-xs">
            Submitted {formatDate(submittedAt)}
          </p>
        )}
      </div>
    </Card>
  );
}
