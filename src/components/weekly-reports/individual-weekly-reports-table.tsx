"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, CheckCircle } from "lucide-react";
import { IndividualWeeklyReportModal } from "./individual-weekly-report-modal";
import {
  getUserIndividualWeeklyReports,
  hasUserSubmittedThisWeekIndividual,
} from "@/lib/weekly-reports";

// Type for weekly report
interface WeeklyReport {
  id: string;
  week_number: number;
  week_year: number;
  week_start_date: string;
  week_end_date: string;
  submitted_at: string | null;
  submission_data: unknown;
  user_id: string;
}

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
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted-foreground animate-pulse">
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
          className="gap-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
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
              <tr className="border-border border-b">
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Week
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Learning Highlights
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Goals Achieved
                </th>
                <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                  Submitted
                </th>
                <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-muted-foreground py-8 text-center"
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
                          ? "border-border/50 border-b"
                          : ""
                      } hover:bg-muted/20 bg-primary/5 border-l-primary border-l-4 transition-colors`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                            <Calendar className="h-4 w-4 text-black dark:text-white" />
                          </div>
                          <div>
                            <div className="text-foreground text-sm font-medium">
                              Week {report.week_number}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {formatWeekRange(
                                report.week_start_date,
                                report.week_end_date
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-foreground max-w-[300px] truncate text-sm">
                          {(submissionData?.skillsLearned as string) ||
                            "No skills noted"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-foreground max-w-[300px] truncate text-sm">
                          {(submissionData?.tasksCompleted as string) ||
                            "No tasks noted"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-muted-foreground text-sm">
                          {new Date(report.submitted_at!).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[#0000ff] text-xs text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                            onClick={() => handleViewReport(report)}
                          >
                            View Report
                          </Button>
                          <Button
                            size="sm"
                            className="bg-[#ff78c8] text-xs text-white hover:bg-[#ff78c8]/90"
                          >
                            <CheckCircle className="mr-1 h-3 w-3 text-white" />
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
      <div className="bg-background fixed top-1/2 left-1/2 max-h-[80vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border shadow-lg">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Weekly Learning Report</h2>
              <p className="text-muted-foreground text-sm">
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
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                <h3 className="font-medium">Tasks/Projects Completed</h3>
              </div>
              <p className="text-muted-foreground bg-muted rounded p-3 text-sm">
                {(submissionData?.tasksCompleted as string) ||
                  "No tasks completed"}
              </p>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-black dark:text-white" />
                <h3 className="font-medium">New Skills/Knowledge Acquired</h3>
              </div>
              <p className="text-muted-foreground bg-muted rounded p-3 text-sm">
                {(submissionData?.skillsLearned as string) ||
                  "No skills learned"}
              </p>
            </div>

            {(submissionData?.challengesFaced as string) && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-black dark:text-white" />
                  <h3 className="font-medium">Challenges & Solutions</h3>
                </div>
                <p className="text-muted-foreground bg-muted rounded p-3 text-sm">
                  {submissionData.challengesFaced as string}
                </p>
              </div>
            )}

            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-black dark:text-white" />
                <h3 className="font-medium">Goals for Next Week</h3>
              </div>
              <p className="text-muted-foreground bg-muted rounded p-3 text-sm">
                {(submissionData?.goalsNextWeek as string) || "No goals set"}
              </p>
            </div>

            {(submissionData?.additionalNotes as string) && (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-black dark:text-white" />
                  <h3 className="font-medium">Additional Notes</h3>
                </div>
                <p className="text-muted-foreground bg-muted rounded p-3 text-sm">
                  {submissionData.additionalNotes as string}
                </p>
              </div>
            )}

            <div className="text-muted-foreground border-t pt-4 text-xs">
              Submitted on {new Date(report.submitted_at!).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
