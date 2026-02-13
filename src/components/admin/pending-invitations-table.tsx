"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";

interface PendingInvite {
  id: string;
  email: string;
  created_at: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}

export function PendingInvitationsTable() {
  const [invitations, setInvitations] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    fetchInvitations();
  }, []);

  async function fetchInvitations() {
    setLoading(true);
    try {
      // Fetch from admin API since we need service_role to access auth.users
      const response = await fetch("/api/admin/pending-invites");
      const data = await response.json();

      if (response.ok && data.invitations) {
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error("Error fetching invitations:", error);
      toast.error("Failed to load pending invitations");
    } finally {
      setLoading(false);
    }
  }

  async function resendInvite(email: string, metadata: any) {
    setResending(email);
    try {
      const response = await fetch("/api/admin/resend-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, metadata }),
      });

      if (response.ok) {
        toast.success(`Invitation resent to ${email}`);
        fetchInvitations(); // Refresh the list
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to resend invitation");
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Failed to resend invitation");
    } finally {
      setResending(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-md border p-8">
        <p className="text-muted-foreground text-center text-sm">
          No pending invitations. All users have accepted their invites!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {invitations.length} pending invitation
          {invitations.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={fetchInvitations} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Name
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Email
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Status
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Invited
              </th>
              <th className="text-muted-foreground px-4 py-4 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invite) => (
              <tr
                key={invite.id}
                className="border-border border-b last:border-0"
              >
                <td className="px-4 py-4">
                  {invite.user_metadata.first_name}{" "}
                  {invite.user_metadata.last_name}
                </td>
                <td className="px-4 py-4">{invite.email}</td>
                <td className="px-4 py-4">
                  <Badge variant="secondary">Pending</Badge>
                </td>
                <td className="px-4 py-4">
                  {new Date(invite.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-4 text-right">
                  <Button
                    onClick={() =>
                      resendInvite(invite.email, invite.user_metadata)
                    }
                    variant="outline"
                    size="sm"
                    disabled={resending === invite.email}
                  >
                    {resending === invite.email ? (
                      <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-1 h-4 w-4" />
                    )}
                    Resend
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
