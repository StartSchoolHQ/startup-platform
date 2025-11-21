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
import { Building2, Calendar, Phone, MessageSquare, Star } from "lucide-react";

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
    client_type?: string;
    call_type?: string;
    how_it_went?: string;
    new_things_learned?: string;
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

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Client Information
              </h3>
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{meeting.client_name}</div>
                  {meeting.client_type && (
                    <div className="text-sm text-muted-foreground">
                      {getClientTypeLabel(meeting.client_type)}
                    </div>
                  )}
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

          {/* Call Type */}
          {meeting.call_type && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Call Type
              </h3>
              <div className="text-sm">
                {getCallTypeLabel(meeting.call_type)}
              </div>
            </div>
          )}

          {/* Outcome */}
          {meeting.how_it_went && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Star className="h-4 w-4" />
                How It Went
              </h3>
              <div className="flex items-center gap-2">
                {getOutcomeBadge(meeting.how_it_went)}
                <span className="text-sm text-muted-foreground">
                  {getOutcomeLabel(meeting.how_it_went)}
                </span>
              </div>
            </div>
          )}

          {/* Learning Notes */}
          {meeting.new_things_learned && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                New Things Learned
              </h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">
                  {meeting.new_things_learned}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timeline
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Logged:</span>
                <span>{formatDate(meeting.created_at)}</span>
              </div>
              {meeting.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cancelled:</span>
                  <span className="text-red-600">
                    {formatDate(meeting.cancelled_at)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
