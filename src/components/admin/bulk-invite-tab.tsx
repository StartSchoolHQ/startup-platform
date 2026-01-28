"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ManualInviteForm } from "./manual-invite-form";
import { CSVInviteUploader } from "./csv-invite-uploader";
import { PendingInvitationsTable } from "./pending-invitations-table";

export function BulkInviteTab() {
  return (
    <Tabs defaultValue="manual" className="space-y-4">
      <TabsList>
        <TabsTrigger value="manual">Manual Invite</TabsTrigger>
        <TabsTrigger value="csv">CSV Upload</TabsTrigger>
        <TabsTrigger value="pending">Pending Invites</TabsTrigger>
      </TabsList>

      <TabsContent value="manual">
        <Card>
          <CardHeader>
            <CardTitle>Invite Single User</CardTitle>
            <CardDescription>
              Send an invitation to one user at a time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualInviteForm />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="csv">
        <Card>
          <CardHeader>
            <CardTitle>Bulk CSV Upload</CardTitle>
            <CardDescription>
              Upload a CSV file with columns: email, first_name, last_name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CSVInviteUploader />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending">
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              View and resend invitations that haven't been accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvitationsTable />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
