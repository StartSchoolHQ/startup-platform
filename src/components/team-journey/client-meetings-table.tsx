import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Zap,
  CreditCard,
  EyeOff,
  Trash2,
  Pencil,
  Filter,
  Download,
  Send,
  FileEdit,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTeamClientMeetings } from "@/lib/database";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { ViewClientMeetingModal } from "./view-client-meeting-modal";
import { AddClientMeetingModal } from "./add-client-meeting-modal";
import { useAppContext } from "@/contexts/app-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DatabaseClientMeeting {
  id: string;
  client_name: string;
  status: "draft" | "scheduled" | "completed" | "cancelled";
  created_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  responsible_user_id: string;
  client_type?: string;
  call_type?: string;
  how_it_went?: string;
  new_things_learned?: string;
  meeting_data?: {
    clientRole?: string;
    clientResponsibilities?: string;
    segmentRelevance?: string;
    meetingGoal?: string;
    assumptionsTested?: string;
    clientFeedback?: string;
    feedbackValidation?: string;
    feedbackChallenges?: string;
    mainLearnings?: string;
    nextStepsClient?: string;
    interestLevel?: string;
    internalActions?: string;
    actionDeadline?: string;
    actionResponsible?: string;
    teamImprovements?: string;
  };
  is_client_name_masked?: boolean; // New field from secure database function
  users: {
    id: string;
    name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ClientMeetingsTableProps {
  teamId: string;
  isTeamMember: boolean;
}

export function ClientMeetingsTable({
  teamId,
  isTeamMember,
}: ClientMeetingsTableProps) {
  const { user } = useAppContext();
  const queryClient = useQueryClient();
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<DatabaseClientMeeting | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] =
    useState<DatabaseClientMeeting | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [meetingToEdit, setMeetingToEdit] =
    useState<DatabaseClientMeeting | null>(null);
  const [interestFilter, setInterestFilter] = useState<string>("all");

  // Use React Query for data fetching
  const { data: meetings = [], isLoading: loading } = useQuery({
    queryKey: ["clientMeetings", teamId, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      try {
        return await getTeamClientMeetings(teamId, user.id);
      } catch (error) {
        console.error("Error loading client meetings:", error);
        toast.error("Failed to load client meetings");
        return [];
      }
    },
    enabled: !!teamId && !!user?.id,
  });

  // Soft delete mutation
  const deleteMeetingMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const supabase = createClient();
      // Cast to any to bypass type check - deleted_at column exists but types not regenerated
      const { error } = await (supabase as any)
        .from("client_meetings")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", meetingId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
      toast.success("Meeting deleted successfully");
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    },
    onError: (error) => {
      console.error("Error deleting meeting:", error);
      toast.error("Failed to delete meeting");
    },
  });

  // Submit draft mutation (converts draft to completed and awards XP/points)
  const submitDraftMutation = useMutation({
    mutationFn: async (meetingId: string) => {
      const supabase = createClient();
      // Cast to any - complete_meeting function exists but types not regenerated
      const { data, error } = await (supabase as any).rpc("complete_meeting", {
        p_meeting_id: meetingId,
      });

      if (error) throw error;
      if (!data?.success) {
        // Check if there are missing fields to show a better error
        if (data?.missing_fields?.length > 0) {
          throw new Error(
            `Missing required fields: ${data.missing_fields.join(", ")}`,
          );
        }
        throw new Error(data?.error || "Failed to submit draft");
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["clientMeetings"] });
      queryClient.invalidateQueries({ queryKey: ["teamAchievementDashboard"] });
      toast.success(
        `Draft submitted! +${data.xp_rewarded} XP, +${data.points_rewarded} Points`,
      );
    },
    onError: (error: Error) => {
      console.error("Error submitting draft:", error);
      // Show a more helpful error message for missing fields
      if (error.message.includes("Missing required fields")) {
        toast.error(error.message, { duration: 5000 });
        toast.info("Please edit the draft to fill in all required fields", {
          duration: 4000,
        });
      } else {
        toast.error("Failed to submit draft");
      }
    },
  });

  const handleDeleteClick = (meeting: DatabaseClientMeeting) => {
    setMeetingToDelete(meeting);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (meeting: DatabaseClientMeeting) => {
    setMeetingToEdit(meeting);
    setEditModalOpen(true);
  };

  // Filter meetings by interest level
  const filteredMeetings = useMemo(() => {
    if (interestFilter === "all") return meetings;
    return meetings.filter(
      (meeting: DatabaseClientMeeting) =>
        meeting.meeting_data?.interestLevel === interestFilter,
    );
  }, [meetings, interestFilter]);

  const confirmDelete = () => {
    if (meetingToDelete) {
      deleteMeetingMutation.mutate(meetingToDelete.id);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleViewMeeting = (meeting: DatabaseClientMeeting) => {
    setSelectedMeeting(meeting);
    setViewModalOpen(true);
  };

  // Interest level display labels
  const interestLevelLabels: Record<string, string> = {
    intent_to_try: "Intent to try",
    willingness_to_pay: "Willingness to pay",
    introductions: "Introductions",
    not_interested: "Not interested",
  };

  // CSV Export function
  const exportToCSV = useCallback(() => {
    if (meetings.length === 0) {
      toast.error("No meetings to export");
      return;
    }

    // CSV headers
    const headers = [
      "Client Name",
      "Role",
      "Meeting Date",
      "Responsible Person",
      "Interest Level",
      "Meeting Goal",
      "Client Feedback",
      "Main Learnings",
      "Next Steps",
      "Internal Actions",
      "Action Deadline",
      "Action Responsible",
    ];

    // Map meetings to CSV rows
    const rows = meetings.map((meeting: DatabaseClientMeeting) => {
      const data = meeting.meeting_data || {};
      const meetingDate = meeting.created_at
        ? new Date(meeting.created_at).toLocaleDateString()
        : "";

      return [
        meeting.client_name,
        data.clientRole || "",
        meetingDate,
        meeting.users?.name || "Unknown",
        interestLevelLabels[data.interestLevel || ""] || "",
        data.meetingGoal || "",
        data.clientFeedback || "",
        data.mainLearnings || "",
        data.nextStepsClient || "",
        data.internalActions || "",
        data.actionDeadline || "",
        data.actionResponsible || "",
      ];
    });

    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value: string) => {
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map((row: string[]) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Create and trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `client-meetings-${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${meetings.length} meetings to CSV`);
  }, [meetings, interestLevelLabels]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Loading client meetings...</div>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No client meetings found for this team yet.
        {isTeamMember && (
          <div className="mt-2 text-sm">
            Click &ldquo;Add Meeting&rdquo; to schedule your first client
            meeting!
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Filter and Export Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Filter by interest:
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-sm min-w-[180px] justify-between"
              >
                {interestFilter === "all"
                  ? `All meetings (${meetings.length})`
                  : `${interestLevelLabels[interestFilter]} (${meetings.filter((m: DatabaseClientMeeting) => m.meeting_data?.interestLevel === interestFilter).length})`}
                <Filter className="h-3 w-3 ml-2 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setInterestFilter("all")}>
                All meetings ({meetings.length})
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setInterestFilter("intent_to_try")}
              >
                Intent to try (
                {
                  meetings.filter(
                    (m: DatabaseClientMeeting) =>
                      m.meeting_data?.interestLevel === "intent_to_try",
                  ).length
                }
                )
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setInterestFilter("willingness_to_pay")}
              >
                Willingness to pay (
                {
                  meetings.filter(
                    (m: DatabaseClientMeeting) =>
                      m.meeting_data?.interestLevel === "willingness_to_pay",
                  ).length
                }
                )
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setInterestFilter("introductions")}
              >
                Introductions (
                {
                  meetings.filter(
                    (m: DatabaseClientMeeting) =>
                      m.meeting_data?.interestLevel === "introductions",
                  ).length
                }
                )
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setInterestFilter("not_interested")}
              >
                Not interested (
                {
                  meetings.filter(
                    (m: DatabaseClientMeeting) =>
                      m.meeting_data?.interestLevel === "not_interested",
                  ).length
                }
                )
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {interestFilter !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInterestFilter("all")}
              className="h-8 px-2 text-xs"
            >
              Clear filter
            </Button>
          )}
        </div>

        {/* Export CSV Button */}
        {isTeamMember && meetings.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="h-8 text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Export CSV
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Client
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Responsible
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Interest
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                XP
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Points
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredMeetings.map(
              (meeting: DatabaseClientMeeting, index: number) => (
                <tr
                  key={meeting.id}
                  className={`${
                    index < filteredMeetings.length - 1
                      ? "border-b border-border/50"
                      : ""
                  } hover:bg-muted/20 transition-colors ${meeting.status === "draft" ? "bg-amber-50/50 dark:bg-amber-900/10" : ""}`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-md ${meeting.status === "draft" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted"}`}
                      >
                        {meeting.status === "draft" ? (
                          <FileEdit className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Building2 className="h-4 w-4 text-black dark:text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {meeting.client_name}
                          {meeting.status === "draft" && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 font-medium uppercase tracking-wide">
                              Draft
                            </span>
                          )}
                          {meeting.is_client_name_masked && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    Client name hidden - only visible to team
                                    members and admins
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created {formatDate(meeting.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage
                          src={
                            meeting.users?.avatar_url || "/avatars/john-doe.jpg"
                          }
                          alt={meeting.users?.name || "Unknown User"}
                        />
                        <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-primary-foreground font-bold text-xs">
                          {(meeting.users?.name || "U")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">
                          {meeting.users?.name || "Unknown User"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(meeting.created_at)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted">
                      {interestLevelLabels[
                        meeting.meeting_data?.interestLevel || ""
                      ] || "—"}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Zap
                        className={`h-4 w-4 ${meeting.status === "draft" ? "text-muted-foreground" : "text-black dark:text-white"}`}
                      />
                      <span
                        className={`text-sm font-medium ${meeting.status === "draft" ? "text-muted-foreground" : ""}`}
                      >
                        {meeting.status === "draft" ? "—" : "50"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <CreditCard
                        className={`h-4 w-4 ${meeting.status === "draft" ? "text-muted-foreground" : "text-black dark:text-white"}`}
                      />
                      <span
                        className={`text-sm font-medium ${meeting.status === "draft" ? "text-muted-foreground" : ""}`}
                      >
                        {meeting.status === "draft" ? "—" : "25"}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end gap-2">
                      {meeting.status === "draft" ? (
                        // Draft meeting actions
                        isTeamMember &&
                        meeting.responsible_user_id === user?.id ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-green-600 text-green-600 hover:bg-green-600 hover:text-white"
                              onClick={() =>
                                submitDraftMutation.mutate(meeting.id)
                              }
                              disabled={submitDraftMutation.isPending}
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {submitDraftMutation.isPending
                                ? "Submitting..."
                                : "Submit"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleEditClick(meeting)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => handleDeleteClick(meeting)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          // Other team members can only view drafts
                          <span className="text-xs text-muted-foreground italic">
                            Pending submission
                          </span>
                        )
                      ) : (
                        // Completed meeting actions
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                            onClick={() => handleViewMeeting(meeting)}
                          >
                            View
                          </Button>
                          {isTeamMember && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={() => handleEditClick(meeting)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleDeleteClick(meeting)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* View Meeting Modal */}
      {selectedMeeting && (
        <ViewClientMeetingModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedMeeting(null);
          }}
          meeting={selectedMeeting}
        />
      )}

      {/* Edit Meeting Modal */}
      {meetingToEdit && (
        <AddClientMeetingModal
          open={editModalOpen}
          onOpenChange={(open) => {
            setEditModalOpen(open);
            if (!open) setMeetingToEdit(null);
          }}
          teamId={teamId}
          editMeeting={meetingToEdit}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Client Meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the meeting with{" "}
              <span className="font-medium">
                {meetingToDelete?.client_name}
              </span>
              ?
              <br />
              <br />
              <span className="text-muted-foreground text-xs">
                Note: The XP and points earned from this meeting will not be
                reversed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMeetingMutation.isPending}
            >
              {deleteMeetingMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
