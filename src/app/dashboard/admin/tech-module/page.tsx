"use client";

import { redirect } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { TechModuleSummary } from "@/components/admin/tech-module/summary";
import { VerdictsTable } from "@/components/admin/tech-module/verdicts-table";
import { DataIssuesTab } from "@/components/admin/tech-module/data-issues-tab";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import {
  usePostDigestToSlack,
  useProgramAssistantLatest,
  useRunProgramAssistantNow,
} from "@/hooks/use-program-assistant";

/**
 * Admin → People → Tech module: the program assistant's daily verdicts.
 * Spec §6 (docs/internal/superpowers/specs/2026-10-13-program-assistant-design.md).
 */
export default function AdminTechModulePage() {
  const { user, loading } = useApp();
  const { data, isLoading, isError, error } = useProgramAssistantLatest();
  const runNow = useRunProgramAssistantNow();
  const postSlack = usePostDigestToSlack();

  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }
  if (loading) return <AdminSkeleton />;

  const openIssues = data.data_issues.filter((i) => !i.resolved_at).length;

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tech module</h2>
        <p className="text-muted-foreground text-sm">
          Qwasar pace and attendance, checked every morning. Rules decide the
          status; the note next to each flagged student is written by Claude
          from the numbers only.
        </p>
      </div>

      {isError ? (
        <Card>
          <CardContent className="text-destructive p-6 text-sm">
            Couldn&apos;t load the latest run — {error?.message ?? "unknown"}.
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <TechModuleSummary
            data={data}
            onRunNow={() => runNow.mutate()}
            runPending={runNow.isPending}
          />
          <Tabs defaultValue="students">
            <TabsList>
              <TabsTrigger value="students">Students</TabsTrigger>
              <TabsTrigger value="issues">
                Data to fix{openIssues > 0 ? ` (${openIssues})` : ""}
              </TabsTrigger>
              <TabsTrigger value="digest">Digest</TabsTrigger>
            </TabsList>
            <TabsContent value="students">
              <Card>
                <CardContent className="pt-6">
                  <VerdictsTable
                    verdicts={data.verdicts}
                    timeline={data.timeline}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle>Data to fix</CardTitle>
                  <CardDescription>
                    Where the Student info sheet and Qwasar disagree. Fix the
                    source, then mark it done; the next run re-checks.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataIssuesTab issues={data.data_issues} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="digest">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <CardTitle>Slack digest</CardTitle>
                    <CardDescription>
                      Generated every run. Scheduled runs post it when the Slack
                      switch in Settings is on; manual runs only post through
                      this button.{" "}
                      {data.run?.slack_posted_at
                        ? `Last posted ${new Date(data.run.slack_posted_at).toLocaleString("en-GB", { timeZone: "Europe/Riga" })}.`
                        : "Not posted yet."}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!data.run?.slack_message || postSlack.isPending}
                    onClick={() => postSlack.mutate()}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {postSlack.isPending ? "Posting…" : "Post to Slack"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted overflow-x-auto rounded-md p-4 text-sm whitespace-pre-wrap">
                    {data.run?.slack_message ?? "No digest yet."}
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
