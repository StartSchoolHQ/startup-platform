import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CheckCircle, X, Eye } from "lucide-react";
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
      whatDidYouDoThisWeek?: string;
      whatWereYourBlockers?: string;
      whatWasYourBiggestAchievement?: string;
      clientsContacted?: number;
      meetingsHeld?: number;
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
          buttonText: "Complete",
          buttonClass:
            "bg-background border border-input text-foreground hover:bg-accent hover:text-accent-foreground",
          icon: null,
        };
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          icon: <X className="h-3 w-3 mr-1" />,
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
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Week
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Weekly Fill
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Clients
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Meetings
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
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
                      ? "border-b border-border/50"
                      : ""
                  } hover:bg-muted/20 transition-colors ${getRowBackgroundColor(
                    report.status
                  )}`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {report.week}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {report.dateRange}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {report.weeklyFill.avatars.map((avatar, idx) => (
                        <Avatar key={idx} className="w-8 h-8">
                          <AvatarImage
                            src={avatar}
                            alt={report.weeklyFill.names[idx]}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-primary-foreground font-bold text-xs">
                            DP
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {report.clients}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {report.meetings}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      {report.status === "done" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                          onClick={() => handleViewReport(report)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Report
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className={`text-xs ${statusConfig.buttonClass}`}
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
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Weekly Report - {selectedReport?.week}</DialogTitle>
            <DialogDescription>{selectedReport?.dateRange}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {selectedReport?.submissions?.map((submission, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="font-semibold text-sm">
                    {submission.users?.name || "Unknown User"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    • {submission.submission_data?.clientsContacted || 0}{" "}
                    clients • {submission.submission_data?.meetingsHeld || 0}{" "}
                    meetings
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      What did you do this week?
                    </div>
                    <div className="text-sm">
                      {submission.submission_data?.whatDidYouDoThisWeek ||
                        "No response"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      What were your blockers?
                    </div>
                    <div className="text-sm">
                      {submission.submission_data?.whatWereYourBlockers ||
                        "No response"}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      What was your biggest achievement?
                    </div>
                    <div className="text-sm">
                      {submission.submission_data
                        ?.whatWasYourBiggestAchievement || "No response"}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!selectedReport?.submissions ||
              selectedReport.submissions.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                No submissions found for this week.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
