import {
  Camera,
  Lightbulb,
  ListOrdered,
  MessageSquare,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import type { SupportMode } from "@/types/support-inbox";

const TIPS: Record<
  SupportMode,
  { title: string; items: { icon: LucideIcon; text: string }[] }
> = {
  problem: {
    title: "What helps us fix it fast",
    items: [
      {
        icon: ListOrdered,
        text: "Steps to reproduce: what you clicked, in order.",
      },
      { icon: Camera, text: "A screenshot of the problem, or the error text." },
      { icon: MessageSquare, text: "What you expected to happen instead." },
    ],
  },
  suggest: {
    title: "What makes a good task",
    items: [
      { icon: Lightbulb, text: "Start with a verb." },
      { icon: Target, text: "One task, one outcome." },
      { icon: MessageSquare, text: "Say why it's worth doing." },
    ],
  },
};

interface Props {
  mode: SupportMode;
  userName?: string | null;
  userEmail?: string | null;
}

/** Left column: three tips for the active mode plus who is sending. Server-renderable. */
export function SupportTips({ mode, userName, userEmail }: Props) {
  const { title, items } = TIPS[mode];
  return (
    <Card className="relative gap-0 self-start overflow-hidden py-0">
      <div
        aria-hidden
        className="bg-primary/15 pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl"
      />
      <div className="relative flex flex-col gap-4 p-5">
        <SectionLabel icon={MessageSquare} title={title} />
        <ul className="space-y-3">
          {items.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm">
              <span className="bg-primary/10 text-primary mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                <Icon className="h-3.5 w-3.5" />
              </span>
              <span className="text-muted-foreground leading-relaxed">
                {text}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground border-t pt-4 text-xs">
          Sending as{" "}
          <span className="text-foreground font-medium">{userName ?? "…"}</span>
          {userEmail && ` · ${userEmail}`}
        </p>
      </div>
    </Card>
  );
}
