"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppContext } from "@/contexts/app-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SupportTips } from "@/components/support/support-tips";
import { ReportProblemForm } from "@/components/support/report-problem-form";
import { SuggestTaskForm } from "@/components/support/suggest-task-form";
import type { SupportMode } from "@/types/support-inbox";

const SUBTITLE: Record<SupportMode, string> = {
  problem:
    "Found a bug, something looks wrong, or you're stuck? Tell us here and the team will get back to you by email.",
  suggest:
    "Know a task that belongs in My Journey? Propose it here. If it fits, we add it to the library.",
};

export default function SupportPage() {
  const { user } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: SupportMode =
    searchParams.get("mode") === "suggest" ? "suggest" : "problem";

  const setMode = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "suggest") params.set("mode", "suggest");
      else params.delete("mode");
      const query = params.toString();
      router.replace(query ? `?${query}` : window.location.pathname, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Support
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            {SUBTITLE[mode]}
          </p>
        </div>
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="problem">Report a problem</TabsTrigger>
            <TabsTrigger value="suggest">Suggest a task</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SupportTips
          mode={mode}
          userName={user?.name}
          userEmail={user?.email}
        />
        {mode === "problem" ? <ReportProblemForm /> : <SuggestTaskForm />}
      </div>
    </div>
  );
}
