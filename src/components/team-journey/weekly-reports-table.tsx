import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CheckCircle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface WeeklyReport {
  id: string;
  week: string;
  dateRange: string;
  weeklyFill: {
    avatars: string[];
    names: string[];
  };
  clients: number;
  meetings: number;
  status: "complete" | "done" | "missed";
  submissions?: Array<{
    submission_data?: {
      commitments?: Array<{
        text: string;
        status: string;
        explanation?: string;
      }>;
      blockers?: string;
      blockersAnalysis?: string;
      helpNeeded?: string;
      meetingsHeld?: number;
      keyInsight?: string;
      mostImportantOutcome?: string;
      measurableProgress?: string;
      biggestAchievement?: string;
      achievementImpact?: string;
      nextWeekPriority?: string; // Legacy field
      nextWeekCommitments?: string[]; // New field
      teamRecognition?: string;
      alignmentScore?: number;
      alignmentReason?: string;
    };
    users?: {
      name?: string;
    };
  }>;
}

interface WeeklyReportsTableProps {
  reports: WeeklyReport[];
}

export function WeeklyReportsTable({ reports }: WeeklyReportsTableProps) {
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(
    null
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewReport = (report: WeeklyReport) => {
    setSelectedReport(report);
    setIsDialogOpen(true);
  };

  const getStatusConfig = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "complete":
        return {
          buttonText: "View",
          buttonClass:
            "bg-background border border-input text-foreground hover:bg-accent hover:text-accent-foreground",
          icon: null,
        };
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90",
          icon: <CheckCircle className="mr-1 h-3 w-3" />,
        };
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          icon: <X className="mr-1 h-3 w-3" />,
        };
    }
  };

  const getRowBackgroundColor = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "done":
        return "bg-primary/5 border-l-4 border-l-primary";
      case "missed":
        return "bg-destructive/5 border-l-4 border-l-destructive";
      default:
        return "";
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Week
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Weekly Fill
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Clients
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Meetings
              </th>
              <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report, index) => {
              const statusConfig = getStatusConfig(report.status);
              return (
                <tr
                  key={report.id}
                  className={`${
                    index < reports.length - 1
                      ? "border-border/50 border-b"
                      : ""
                  } hover:bg-muted/20 transition-colors ${getRowBackgroundColor(
                    report.status
                  )}`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                        <Calendar className="h-4 w-4 text-black dark:text-white" />
                      </div>
                      <div>
                        <div className="text-foreground text-sm font-medium">
                          {report.week}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {report.dateRange}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      {report.weeklyFill.avatars.map((avatar, idx) => (
                        <Avatar key={idx} className="h-8 w-8">
                          <AvatarImage
                            src={avatar}
                            alt={report.weeklyFill.names[idx]}
                          />
                          <AvatarFallback className="text-primary-foreground bg-gradient-to-r from-purple-400 to-pink-400 text-xs font-bold">
                            {(report.weeklyFill.names[idx] || "U")
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-black dark:text-white" />
                      <span className="text-foreground text-sm font-medium">
                        {report.clients}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-black dark:text-white" />
                      <span className="text-sm font-medium">
                        {report.meetings}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      {report.status === "done" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-[#0000ff] text-xs text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                          onClick={() => handleViewReport(report)}
                        >
                          View Report
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={`text-xs ${statusConfig.buttonClass}`}
                        onClick={
                          report.status === "complete"
                            ? () => handleViewReport(report)
                            : undefined
                        }
                      >
                        {statusConfig.icon}
                        {statusConfig.buttonText}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* View Report Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[85vh] sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>Weekly Report - {selectedReport?.week}</DialogTitle>
            <DialogDescription>{selectedReport?.dateRange}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(85vh-8rem)] space-y-4 overflow-y-auto">
            {selectedReport?.submissions?.map((submission, index) => (
              <div key={index} className="space-y-4 rounded-lg border p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-sm font-semibold">
                    {submission.users?.name || "Unknown User"}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    • {submission.submission_data?.meetingsHeld || 0} meetings
                    {submission.submission_data?.alignmentScore && (
                      <>
                        {" "}
                        • Alignment: {submission.submission_data.alignmentScore}
                        /10
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Q1: Commitments */}
                  {submission.submission_data?.commitments &&
                    submission.submission_data.commitments.length > 0 && (
                      <div>
                        <div className="mb-2 text-sm font-semibold">
                          Top 3 Commitments
                        </div>
                        {submission.submission_data.commitments.map(
                          (commitment, idx) => (
                            <div
                              key={idx}
                              className="mb-2 border-l-2 pl-3 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {commitment.status === "completed" && "✅"}
                                  {commitment.status === "in_progress" && "🔄"}
                                  {commitment.status === "not_done" && "❌"}
                                </span>
                                <span>{commitment.text}</span>
                              </div>
                              {commitment.explanation && (
                                <div className="text-muted-foreground mt-1 text-xs">
                                  {commitment.explanation}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}

                  {/* Q2: Blockers */}
                  {submission.submission_data?.blockers && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        Blockers/Challenges
                      </div>
                      <div className="text-sm">
                        {submission.submission_data.blockers}
                      </div>
                      {submission.submission_data.blockersAnalysis && (
                        <div className="text-muted-foreground mt-1 text-sm">
                          Analysis:{" "}
                          {submission.submission_data.blockersAnalysis}
                        </div>
                      )}
                      {submission.submission_data.helpNeeded && (
                        <div className="text-muted-foreground mt-1 text-sm">
                          Help needed: {submission.submission_data.helpNeeded}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Q4: Interactions */}
                  {(submission.submission_data?.keyInsight ||
                    submission.submission_data?.mostImportantOutcome) && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        Customer Interactions
                      </div>
                      {submission.submission_data.keyInsight && (
                        <div className="mb-1 text-sm">
                          Key insight: {submission.submission_data.keyInsight}
                        </div>
                      )}
                      {submission.submission_data.mostImportantOutcome && (
                        <div className="text-sm">
                          Outcome:{" "}
                          {submission.submission_data.mostImportantOutcome}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Q5: Measurable Progress */}
                  {submission.submission_data?.measurableProgress && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        Measurable Progress
                      </div>
                      <div className="text-sm">
                        {submission.submission_data.measurableProgress}
                      </div>
                    </div>
                  )}

                  {/* Q6: Achievement */}
                  {submission.submission_data?.biggestAchievement && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        Most Important Achievement
                      </div>
                      <div className="text-sm">
                        {submission.submission_data.biggestAchievement}
                      </div>
                      {submission.submission_data.achievementImpact && (
                        <div className="text-muted-foreground mt-1 text-sm">
                          Impact: {submission.submission_data.achievementImpact}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Q7: Next Week Commitments (new) or Priority (legacy) */}
                  {(submission.submission_data?.nextWeekCommitments?.length ||
                    submission.submission_data?.nextWeekPriority) && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        {submission.submission_data?.nextWeekCommitments?.length
                          ? "Top 3 Commitments for Next Week"
                          : "Next Week Priority"}
                      </div>
                      {submission.submission_data?.nextWeekCommitments
                        ?.length ? (
                        <ul className="list-inside list-disc space-y-1 text-sm">
                          {submission.submission_data.nextWeekCommitments.map(
                            (commitment: string, idx: number) => (
                              <li key={idx}>{commitment}</li>
                            )
                          )}
                        </ul>
                      ) : (
                        <div className="text-sm">
                          {submission.submission_data?.nextWeekPriority}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Q8: Team Recognition */}
                  {submission.submission_data?.teamRecognition && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        Team Recognition
                      </div>
                      <div className="text-sm">
                        {submission.submission_data.teamRecognition}
                      </div>
                    </div>
                  )}

                  {/* Q9: Alignment */}
                  {submission.submission_data?.alignmentReason && (
                    <div>
                      <div className="mb-1 text-sm font-semibold">
                        Alignment/Motivation (
                        {submission.submission_data.alignmentScore}/10)
                      </div>
                      <div className="text-sm">
                        {submission.submission_data.alignmentReason}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {(!selectedReport?.submissions ||
              selectedReport.submissions.length === 0) && (
              <div className="text-muted-foreground py-8 text-center">
                No submissions found for this week.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
