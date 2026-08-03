"use client";

import { useState } from "react";
import { redirect } from "next/navigation";
import { IssueTab } from "@/components/diplomas/issue-tab";
import { IssuedTab } from "@/components/diplomas/issued-tab";
import { SetupTab } from "@/components/diplomas/setup-tab";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/app-context";

export default function AdminDiplomasPage() {
  const { user, loading } = useApp();
  const [tab, setTab] = useState("issue");

  // Client-side admin guard. Server-side requireAdmin() is the real fence.
  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading || !user || user.primary_role !== "admin") {
    return <AdminSkeleton />;
  }

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Diplomas</h2>
        <p className="text-muted-foreground">
          Generate Supplement to Diploma PDFs from platform + Qwasar progress.
        </p>
      </div>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="issue">Issue</TabsTrigger>
          <TabsTrigger value="issued">Issued</TabsTrigger>
          <TabsTrigger value="setup">Setup</TabsTrigger>
        </TabsList>
        <TabsContent value="issue">
          <IssueTab active={tab === "issue"} />
        </TabsContent>
        <TabsContent value="issued">
          <IssuedTab active={tab === "issued"} />
        </TabsContent>
        <TabsContent value="setup">
          <SetupTab active={tab === "setup"} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
