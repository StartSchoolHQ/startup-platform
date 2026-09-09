"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAiReviewSettings,
  useSetAiReviewSettings,
} from "@/hooks/use-ai-review-settings";

export function AiReviewSettingsCard() {
  const { data: settings, isLoading, isError } = useAiReviewSettings();
  const setSettings = useSetAiReviewSettings();

  const [thresholdInput, setThresholdInput] = useState(
    String(settings.confidenceThreshold)
  );
  const [modelInput, setModelInput] = useState(settings.model);

  useEffect(() => {
    // Sync local editable copies whenever the server value changes (initial
    // load, or after a successful save) — not while the admin is mid-edit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThresholdInput(String(settings.confidenceThreshold));
    setModelInput(settings.model);
  }, [settings.confidenceThreshold, settings.model]);

  const handleThresholdBlur = () => {
    const parsed = parseFloat(thresholdInput);
    if (Number.isNaN(parsed)) {
      setThresholdInput(String(settings.confidenceThreshold));
      return;
    }
    const clamped = Math.min(1, Math.max(0, parsed));
    if (clamped !== settings.confidenceThreshold) {
      setSettings.mutate({ confidenceThreshold: clamped });
    } else {
      setThresholdInput(String(clamped));
    }
  };

  const handleModelBlur = () => {
    const trimmed = modelInput.trim();
    if (!trimmed) {
      setModelInput(settings.model);
    } else if (trimmed !== settings.model) {
      setSettings.mutate({ model: trimmed });
    }
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Task Reviewer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Couldn&apos;t load AI review settings — refresh to try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Task Reviewer</CardTitle>
        <CardDescription>
          Controls the automatic reviewer for My Journey task submissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="ai-review-enabled">AI review</Label>
            <p className="text-muted-foreground text-sm">
              Kill switch — turns the automatic reviewer off entirely
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-[1.15rem] w-8 rounded-full" />
          ) : (
            <Switch
              id="ai-review-enabled"
              checked={settings.enabled}
              disabled={setSettings.isPending}
              onCheckedChange={(checked) =>
                setSettings.mutate({ enabled: checked })
              }
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-review-mode">Mode</Label>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Select
              value={settings.mode}
              disabled={setSettings.isPending}
              onValueChange={(value) =>
                setSettings.mutate({ mode: value as "ai" | "auto_approve" })
              }
            >
              <SelectTrigger id="ai-review-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ai">AI review</SelectItem>
                <SelectItem value="auto_approve">
                  Auto-approve — rollback switch: every submission passes
                  instantly
                </SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-review-threshold">Confidence threshold</Label>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="ai-review-threshold"
              type="number"
              step={0.05}
              min={0}
              max={1}
              value={thresholdInput}
              disabled={setSettings.isPending}
              onChange={(e) => setThresholdInput(e.target.value)}
              onBlur={handleThresholdBlur}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ai-review-model">Model</Label>
          {isLoading ? (
            <Skeleton className="h-9 w-full" />
          ) : (
            <Input
              id="ai-review-model"
              value={modelInput}
              disabled={setSettings.isPending}
              onChange={(e) => setModelInput(e.target.value)}
              onBlur={handleModelBlur}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
