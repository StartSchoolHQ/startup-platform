"use client";

import { useCallback } from "react";
import { useApp } from "@/contexts/app-context";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { AdminUsersTable } from "@/components/admin/admin-users-table";
import { BulkInviteTab } from "@/components/admin/bulk-invite-tab";

export default function AdminUsersPage() {
  const { user, loading } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();

  const validTabs = ["all-users", "invitations"];
  const tabFromUrl = searchParams.get("tab");
  const activeTab = validTabs.includes(tabFromUrl ?? "")
    ? tabFromUrl!
    : "all-users";

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "all-users") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, {
        scroll: false,
      });
    },
    [searchParams, router]
  );

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  if (loading) {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Users</h2>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="all-users">Users</TabsTrigger>
          <TabsTrigger value="invitations">Invitations</TabsTrigger>
        </TabsList>

        <TabsContent value="all-users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All users</CardTitle>
              <CardDescription>
                Search, filter by batch or status, open a profile.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminUsersTable />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <BulkInviteTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
