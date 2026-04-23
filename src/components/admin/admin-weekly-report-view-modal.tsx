"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Trophy,
  Target,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Compass,
  Users,
  Calendar,
  Heart,
  ArrowRight,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CommitmentStatus = "completed" | "in_progress" | "not_done";

interface Commitment {
  text: string;
  status: CommitmentStatus;
  explanation?: string;
}

interface SubmissionData {
  commitments?: Commitment[];
  blockers?: string;
  blockersAnalysis?: string;
  helpNeeded?: string;
  biggestAchievement?: string;
  achievementImpact?: string;
  mostImportantOutcome?: string;
  keyInsight?: string;
  measurableProgress?: string;
  teamRecognition?: string;
  alignmentScore?: number;
  alignmentReason?: string;
  meetingsHeld?: number;
  nextWeekPriority?: string;
  nextWeekCommitments?: string[];
  submittedAt?: string;
}

export interface AdminWeeklyReportRow {
  id: string;
  user_id: string;
  team_id: string | null;
  week_number: number;
  week_year: number;
  week_start_date: string;
  week_end_date: string;
  submitted_at: string | null;
  status: string | null;
  context: string | null;
  submission_data: SubmissionData | null;
  user: { id: string; name: string | null; email: string } | null;
  team: { id: string; name: string } | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: AdminWeeklyReportRow | null;
}

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(date: string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function CommitmentStatusIcon({ status }: { status: CommitmentStatus }) {
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
  }
  if (status === "in_progress") {
    return <Clock className="h-4 w-4 shrink-0 text-amber-600" />;
  }
  return <XCircle className="h-4 w-4 shrink-0 text-red-600" />;
}

function Section({
  icon: Icon,
  title,
  children,
  tone = "default",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "warning" | "success";
}) {
  const toneStyles = {
    default: "border-border bg-card",
    warning: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20",
    success: "border-green-200 bg-green-50/50 dark:bg-green-950/20",
  };
  const iconTone = {
    default: "text-muted-foreground",
    warning: "text-amber-600",
    success: "text-green-600",
  };
  return (
    <div className={cn("rounded-lg border p-4", toneStyles[tone])}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconTone[tone])} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Quote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="border-muted-foreground/30 text-foreground/90 border-l-2 pl-3 italic">
      {children}
    </blockquote>
  );
}

function EmptyValue() {
  return <span className="text-muted-foreground italic">Not provided</span>;
}

function textOrEmpty(value: string | undefined | null) {
  if (!value || !value.trim()) return <EmptyValue />;
  return <span className="whitespace-pre-wrap">{value}</span>;
}

export function AdminWeeklyReportViewModal({
  open,
  onOpenChange,
  report,
}: Props) {
  if (!report) return null;

  const data = report.submission_data || {};
  const commitments = data.commitments || [];
  const nextCommitments = data.nextWeekCommitments || [];
  const alignment = data.alignmentScore ?? 0;

  const userName = report.user?.name || report.user?.email || "Unknown user";
  const teamName = report.team?.name || "—";

  const weekLabel = `Week ${report.week_number}`;
  const weekRange = `${formatDate(report.week_start_date)} – ${formatDate(
    report.week_end_date
  )}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            <span>{userName}</span>
            <Badge variant="outline" className="font-normal">
              {teamName}
            </Badge>
            <Badge variant="secondary" className="font-normal">
              {weekLabel} · {report.week_year}
            </Badge>
            {report.status === "draft" && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                Draft
              </Badge>
            )}
          </DialogTitle>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {weekRange}
            </span>
            <span>Submitted: {formatDateTime(report.submitted_at)}</span>
            {typeof data.meetingsHeld === "number" && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {data.meetingsHeld} meeting{data.meetingsHeld === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <Section icon={Target} title="Commitments this week">
            {commitments.length === 0 ? (
              <EmptyValue />
            ) : (
              <ul className="space-y-3">
                {commitments.map((c, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CommitmentStatusIcon status={c.status} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{c.text || <EmptyValue />}</p>
                      {c.explanation && c.explanation.trim() && (
                        <p className="text-muted-foreground mt-0.5 text-xs whitespace-pre-wrap">
                          {c.explanation}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section icon={Trophy} title="Biggest achievement" tone="success">
            <div className="space-y-2">
              <p className="font-medium">
                {textOrEmpty(data.biggestAchievement)}
              </p>
              {data.achievementImpact && data.achievementImpact.trim() && (
                <p className="text-muted-foreground text-xs">
                  <span className="font-semibold">Impact:</span>{" "}
                  {data.achievementImpact}
                </p>
              )}
            </div>
          </Section>

          <div className="grid gap-4 md:grid-cols-2">
            <Section icon={Sparkles} title="Most important outcome">
              <Quote>{textOrEmpty(data.mostImportantOutcome)}</Quote>
            </Section>

            <Section icon={Lightbulb} title="Key insight">
              <Quote>{textOrEmpty(data.keyInsight)}</Quote>
            </Section>
          </div>

          <Section icon={TrendingUp} title="Measurable progress">
            {textOrEmpty(data.measurableProgress)}
          </Section>

          {(data.blockers || data.blockersAnalysis || data.helpNeeded) && (
            <Section icon={AlertTriangle} title="Blockers" tone="warning">
              <div className="space-y-3">
                {data.blockers && data.blockers.trim() && (
                  <div>
                    <p className="text-xs font-semibold">What blocked them</p>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {data.blockers}
                    </p>
                  </div>
                )}
                {data.blockersAnalysis && data.blockersAnalysis.trim() && (
                  <div>
                    <p className="text-xs font-semibold">Analysis</p>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {data.blockersAnalysis}
                    </p>
                  </div>
                )}
                {data.helpNeeded && data.helpNeeded.trim() && (
                  <div>
                    <p className="flex items-center gap-1 text-xs font-semibold">
                      <HelpCircle className="h-3 w-3" /> Help needed
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap">
                      {data.helpNeeded}
                    </p>
                  </div>
                )}
              </div>
            </Section>
          )}

          <Section icon={Compass} title="Alignment with goals">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full">
                  <div
                    className={cn(
                      "absolute top-0 left-0 h-full rounded-full transition-all",
                      alignment >= 8
                        ? "bg-green-500"
                        : alignment >= 5
                          ? "bg-amber-500"
                          : "bg-red-500"
                    )}
                    style={{ width: `${(alignment / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {alignment}/10
                </span>
              </div>
              {data.alignmentReason && data.alignmentReason.trim() && (
                <p className="text-muted-foreground text-xs whitespace-pre-wrap">
                  {data.alignmentReason}
                </p>
              )}
            </div>
          </Section>

          {data.teamRecognition && data.teamRecognition.trim() && (
            <Section icon={Heart} title="Team recognition">
              <p className="whitespace-pre-wrap">{data.teamRecognition}</p>
            </Section>
          )}

          <Separator />

          <Section icon={ArrowRight} title="Next week">
            <div className="space-y-3">
              {data.nextWeekPriority && data.nextWeekPriority.trim() && (
                <div>
                  <p className="text-xs font-semibold">Top priority</p>
                  <p className="mt-0.5 whitespace-pre-wrap">
                    {data.nextWeekPriority}
                  </p>
                </div>
              )}
              {nextCommitments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold">Commitments</p>
                  <ul className="mt-1 space-y-1">
                    {nextCommitments.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5">•</span>
                        <span className="whitespace-pre-wrap">{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!data.nextWeekPriority && nextCommitments.length === 0 && (
                <EmptyValue />
              )}
            </div>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
