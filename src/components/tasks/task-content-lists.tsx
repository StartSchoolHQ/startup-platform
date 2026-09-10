import { ArrowUpRight, Link2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TaskResource } from "@/lib/task-content";

/** Small section heading used inside task cards and the preview modal. */
export function TaskSectionTitle({
  icon: Icon,
  children,
}: {
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <h3 className="text-muted-foreground mb-2.5 flex items-center gap-2 text-xs font-medium">
      {Icon && <Icon className="text-primary h-3.5 w-3.5" />}
      {children}
    </h3>
  );
}

/** Learning objectives: plain bullets with a primary dot. */
export function TaskObjectivesList({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm">
          <span className="bg-primary mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
          <span className="break-words">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** External resources: quiet link rows that open in a new tab. */
export function TaskResourceList({ items }: { items: TaskResource[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid gap-2">
      {items.map((resource, i) => (
        <li key={i}>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group hover:border-primary/60 hover:bg-primary/5 flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors"
          >
            <span className="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
              <Link2 className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {resource.title || "External resource"}
              </span>
              {resource.description && (
                <span className="text-muted-foreground mt-0.5 line-clamp-2 block text-xs">
                  {resource.description}
                </span>
              )}
              <span className="text-muted-foreground mt-0.5 block truncate text-[11px]">
                {resource.url}
              </span>
            </span>
            <ArrowUpRight className="text-muted-foreground group-hover:text-primary mt-0.5 h-4 w-4 shrink-0 transition-colors" />
          </a>
        </li>
      ))}
    </ul>
  );
}
