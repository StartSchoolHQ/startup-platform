"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eye, Plus, Calendar, CheckCircle } from "lucide-react";
import { IndividualWeeklyReportModal } from "./individual-weekly-report-modal";
import {
  getUserIndividualWeeklyReports,
  hasUserSubmittedThisWeekIndividual,
} from "@/lib/weekly-reports";
import type { WeeklyReport } from "@/types/database";

// Helper function to format week range
function formatWeekRange(startDate: string, endDate: string) {
  const start = new Date(startDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const end = new Date(endDate).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${start} - ${end}`;
}

interface IndividualWeeklyReportsTableProps {
  userId: string;
}

export function IndividualWeeklyReportsTable({
  userId,
}: IndividualWeeklyReportsTableProps) {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [hasSubmittedThisWeek, setHasSubmittedThisWeek] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(
    null
  );
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [reportsData, submissionStatus] = await Promise.all([
        getUserIndividualWeeklyReports(userId),
        hasUserSubmittedThisWeekIndividual(userId),
      ]);

      setReports(reportsData);
      setHasSubmittedThisWeek(submissionStatus);
    } catch (error) {
      console.error("Error loading individual reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewReport = (report: WeeklyReport) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  const handleSuccess = () => {
    loadReports(); // Reload reports after successful submission
  };

  // const getStatusConfig = () => {
  //   return {
  //     buttonText: "Done",
  //     buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
  //     icon: <CheckCircle className="h-3 w-3 mr-1" />,
  //   };
  // };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Loading reports...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Individual Learning Reports</h2>
        <Button
          onClick={() => setIsModalOpen(true)}
          disabled={hasSubmittedThisWeek}
          size="sm"
          className="gap-2 bg-[#ff78c8] hover:bg-[#ff78c8]/90 text-white"
        >
          <Plus className="h-4 w-4 text-white" />
          {hasSubmittedThisWeek ? "Report Submitted" : "Submit This Week"}
        </Button>
      </div>

      {/* Weekly Reports Table */}
      <div className="bg-card rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                  Week
                </th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                  Learning Highlights
                </th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                  Goals Achieved
                </th>
                <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                  Submitted
                </th>
                <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No individual reports submitted yet. Start by submitting
                    your first weekly report!
                  </td>
                </tr>
              ) : (
                reports.map((report, index) => {
                  const submissionData = report.submission_data as Record<
                    string,
                    unknown
                  >;
                  // const statusConfig = getStatusConfig();

                  return (
                    <tr
                      key={report.id}
                      className={`${
                        index < reports.length - 1
                          ? "border-b border-border/50"
                          : ""
                      } hover:bg-muted/20 transition-colors bg-primary/5 border-l-4 border-l-primary`}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                            <Calendar className="h-4 w-4 text-black dark:text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-sm text-foreground">
                              Week {report.week_number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatWeekRange(
                                report.week_start_date,
                                report.week_end_date
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-[300px] truncate text-sm text-foreground">
                          {(submissionData?.skillsLearned as string) ||
                            "No skills noted"}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="max-w-[300px] truncate text-sm text-foreground">
                          {(submissionData?.tasksCompleted as string) ||
                            "No tasks noted"}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-muted-foreground">
                          {new Date(report.submitted_at!).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                            onClick={() => handleViewReport(report)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Report
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs bg-[#ff78c8] hover:bg-[#ff78c8]/90 text-white"
                          >
                            <CheckCircle className="h-3 w-3 mr-1 text-white" />
                            Done
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Report Modal */}
      <IndividualWeeklyReportModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        userId={userId}
        onSuccess={handleSuccess}
      />

      {/* View Report Modal */}
      {selectedReport && (
        <ViewIndividualReportModal
          open={isViewModalOpen}
          onOpenChange={setIsViewModalOpen}
          report={selectedReport}
        />
      )}
    </div>
  );
}

// View Report Modal Component
interface ViewIndividualReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: WeeklyReport;
}

function ViewIndividualReportModal({
  open,
  onOpenChange,
  report,
}: ViewIndividualReportModalProps) {
  const submissionData = report.submission_data as Record<string, unknown>;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "block" : "hidden"}`}>
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background border rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Weekly Learning Report</h2>
              <p className="text-sm text-muted-foreground">
                Week {report.week_number} •{" "}
                {formatWeekRange(report.week_start_date, report.week_end_date)}
              </p>
            </div>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              ×
            </Button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                <h3 className="font-medium">Tasks/Projects Completed</h3>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {(submissionData?.tasksCompleted as string) ||
                  "No tasks completed"}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-black dark:text-white" />
                <h3 className="font-medium">New Skills/Knowledge Acquired</h3>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {(submissionData?.skillsLearned as string) ||
                  "No skills learned"}
              </p>
            </div>

            {(submissionData?.challengesFaced as string) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-black dark:text-white" />
                  <h3 className="font-medium">Challenges & Solutions</h3>
                </div>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {submissionData.challengesFaced as string}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                <h3 className="font-medium">Goals for Next Week</h3>
              </div>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {(submissionData?.goalsNextWeek as string) || "No goals set"}
              </p>
            </div>

            {(submissionData?.additionalNotes as string) && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-black dark:text-white" />
                  <h3 className="font-medium">Additional Notes</h3>
                </div>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {submissionData.additionalNotes as string}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-4 border-t">
              Submitted on {new Date(report.submitted_at!).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
