import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Zap, CreditCard, Eye } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getTeamClientMeetings } from "@/lib/database";
import { toast } from "sonner";
import { ViewClientMeetingModal } from "./view-client-meeting-modal";

interface DatabaseClientMeeting {
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
}

interface ClientMeetingsTableProps {
  teamId: string;
  isTeamMember: boolean;
  onDataChange?: () => void; // For refreshing parent component
}

export function ClientMeetingsTable({
  teamId,
  isTeamMember,
}: ClientMeetingsTableProps) {
  const [meetings, setMeetings] = useState<DatabaseClientMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] =
    useState<DatabaseClientMeeting | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTeamClientMeetings(teamId);
      setMeetings(data);
    } catch (error) {
      console.error("Error loading client meetings:", error);
      toast.error("Failed to load client meetings");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  // Load meetings data
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

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
                Rewards
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {meetings.map((meeting, index) => (
              <tr
                key={meeting.id}
                className={`${
                  index < meetings.length - 1 ? "border-b border-border/50" : ""
                } hover:bg-muted/20 transition-colors`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {meeting.client_name}
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
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">50</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">25</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleViewMeeting(meeting)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
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
    </div>
  );
}
