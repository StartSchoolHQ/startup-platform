"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Calendar,
  Phone,
  MessageSquare,
  Star,
  EyeOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ViewClientMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  meeting: {
    id: string;
    client_name: string;
    status: string;
    created_at: string | null;
    completed_at: string | null;
    cancelled_at: string | null;
    responsible_user_id: string;
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
    is_client_name_masked?: boolean;
    users: {
      id: string;
      name: string | null;
      avatar_url: string | null;
    } | null;
  };
}

export function ViewClientMeetingModal({
  isOpen,
  onClose,
  meeting,
}: ViewClientMeetingModalProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getClientTypeLabel = (type: string) => {
    switch (type) {
      case "new":
        return "New Client";
      case "returning":
        return "Returning Client";
      default:
        return "Unknown";
    }
  };

  const getCallTypeLabel = (type: string) => {
    switch (type) {
      case "discovery":
        return "Discovery Call";
      case "demo":
        return "Product Demo";
      case "follow_up":
        return "Follow-up Call";
      case "consultation":
        return "Consultation";
      case "proposal":
        return "Proposal Presentation";
      case "check_in":
        return "Check-in Meeting";
      case "support":
        return "Support Call";
      case "other":
        return "Other";
      default:
        return "Unknown";
    }
  };

  const getOutcomeLabel = (outcome: string) => {
    switch (outcome) {
      case "excellent":
        return "Excellent - Exceeded expectations";
      case "good":
        return "Good - Met expectations";
      case "average":
        return "Average - Some challenges";
      case "poor":
        return "Poor - Major issues";
      default:
        return "Not specified";
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "excellent":
        return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
      case "good":
        return <Badge className="bg-blue-100 text-blue-800">Good</Badge>;
      case "average":
        return <Badge className="bg-yellow-100 text-yellow-800">Average</Badge>;
      case "poor":
        return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
      default:
        return <Badge variant="outline">Not specified</Badge>;
    }
  };

  const getInterestLevelLabel = (level: string) => {
    switch (level) {
      case "intent_to_try":
        return "Intent to try";
      case "willingness_to_pay":
        return "Willingness to pay";
      case "introductions":
        return "Offered introductions";
      case "not_interested":
        return "Not interested";
      default:
        return "Not specified";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Client Meeting Details
          </DialogTitle>
          <DialogDescription>
            View comprehensive information about this client meeting
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm uppercase tracking-wide">
                Client
              </h3>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {meeting.client_name}
                    {meeting.is_client_name_masked && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Client name hidden - only visible to team members
                              and admins
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Responsible Person
              </h3>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="w-10 h-10">
                  <AvatarImage
                    src={meeting.users?.avatar_url || "/avatars/john-doe.jpg"}
                    alt={meeting.users?.name || "Unknown User"}
                  />
                  <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-primary-foreground font-bold text-sm">
                    {(meeting.users?.name || "U")
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {meeting.users?.name || "Unknown User"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Team Member
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Q1: Who & relevance */}
          {(meeting.meeting_data?.clientRole ||
            meeting.meeting_data?.clientResponsibilities ||
            meeting.meeting_data?.segmentRelevance) && (
            <div className="space-y-3">
              <h3 className="font-semibold">
                Who did you meet and why relevant?
              </h3>
              {meeting.meeting_data.clientRole && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Role
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.clientRole}
                  </div>
                </div>
              )}
              {meeting.meeting_data.clientResponsibilities && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Responsibilities
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.clientResponsibilities}
                  </div>
                </div>
              )}
              {meeting.meeting_data.segmentRelevance && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Target Segment Match
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.segmentRelevance}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Q2: Goal & assumptions */}
          {(meeting.meeting_data?.meetingGoal ||
            meeting.meeting_data?.assumptionsTested) && (
            <div className="space-y-3">
              <h3 className="font-semibold">Meeting Goal & Assumptions</h3>
              {meeting.meeting_data.meetingGoal && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Goal
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.meetingGoal}
                  </div>
                </div>
              )}
              {meeting.meeting_data.assumptionsTested && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Assumptions Tested
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.assumptionsTested}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Q3: Feedback */}
          {(meeting.meeting_data?.clientFeedback ||
            meeting.meeting_data?.feedbackValidation ||
            meeting.meeting_data?.feedbackChallenges) && (
            <div className="space-y-3">
              <h3 className="font-semibold">Client Feedback</h3>
              {meeting.meeting_data.clientFeedback && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm">
                    {meeting.meeting_data.clientFeedback}
                  </div>
                </div>
              )}
              {meeting.meeting_data.feedbackValidation && (
                <div>
                  <div className="text-sm font-medium text-green-600">
                    ✓ Validated
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.feedbackValidation}
                  </div>
                </div>
              )}
              {meeting.meeting_data.feedbackChallenges && (
                <div>
                  <div className="text-sm font-medium text-orange-600">
                    ⚠ Challenged
                  </div>
                  <div className="text-sm">
                    {meeting.meeting_data.feedbackChallenges}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Q4: Main learnings */}
          {meeting.meeting_data?.mainLearnings && (
            <div className="space-y-2">
              <h3 className="font-semibold">Main Learnings</h3>
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {meeting.meeting_data.mainLearnings}
                </p>
              </div>
            </div>
          )}

          {/* Q5: Next steps */}
          {(meeting.meeting_data?.nextStepsClient ||
            meeting.meeting_data?.interestLevel) && (
            <div className="space-y-3">
              <h3 className="font-semibold">Next Steps with Client</h3>
              {meeting.meeting_data.nextStepsClient && (
                <div className="text-sm">
                  {meeting.meeting_data.nextStepsClient}
                </div>
              )}
              {meeting.meeting_data.interestLevel && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {getInterestLevelLabel(meeting.meeting_data.interestLevel)}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Q6: Internal actions */}
          {(meeting.meeting_data?.internalActions ||
            meeting.meeting_data?.actionDeadline ||
            meeting.meeting_data?.actionResponsible) && (
            <div className="space-y-3 p-4 border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/10">
              <h3 className="font-semibold">Internal Actions</h3>
              {meeting.meeting_data.internalActions && (
                <div className="text-sm">
                  {meeting.meeting_data.internalActions}
                </div>
              )}
              <div className="flex gap-4 text-sm">
                {meeting.meeting_data.actionDeadline && (
                  <div>
                    <span className="font-medium">Deadline:</span>{" "}
                    {new Date(
                      meeting.meeting_data.actionDeadline
                    ).toLocaleDateString()}
                  </div>
                )}
                {meeting.meeting_data.actionResponsible && (
                  <div>
                    <span className="font-medium">Responsible:</span>{" "}
                    {meeting.meeting_data.actionResponsible}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Q7: Team improvements */}
          {meeting.meeting_data?.teamImprovements && (
            <div className="space-y-2">
              <h3 className="font-semibold">Team Learnings</h3>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {meeting.meeting_data.teamImprovements}
                </p>
              </div>
            </div>
          )}

          {/* Learning Notes */}
          {meeting.meeting_data?.mainLearnings && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                New Things Learned
              </h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {meeting.meeting_data.mainLearnings}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2 pt-4 border-t">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logged:</span>
                <span>{formatDate(meeting.created_at)}</span>
              </div>
              {meeting.completed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Completed:</span>
                  <span>{formatDate(meeting.completed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
