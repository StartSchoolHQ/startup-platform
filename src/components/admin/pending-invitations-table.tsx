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
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-md border p-8">
        <p className="text-sm text-muted-foreground text-center">
          No pending invitations. All users have accepted their invites!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          {invitations.length} pending invitation{invitations.length !== 1 ? "s" : ""}
        </p>
        <Button onClick={fetchInvitations} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Name
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Email
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Invited
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invite) => (
              <tr key={invite.id} className="border-b border-border last:border-0">
                <td className="py-4 px-4">
                  {invite.user_metadata.first_name} {invite.user_metadata.last_name}
                </td>
                <td className="py-4 px-4">{invite.email}</td>
                <td className="py-4 px-4">
                  <Badge variant="secondary">Pending</Badge>
                </td>
                <td className="py-4 px-4">
                  {new Date(invite.created_at).toLocaleDateString()}
                </td>
                <td className="py-4 px-4 text-right">
                  <Button
                    onClick={() => resendInvite(invite.email, invite.user_metadata)}
                    variant="outline"
                    size="sm"
                    disabled={resending === invite.email}
                  >
                    {resending === invite.email ? (
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
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
