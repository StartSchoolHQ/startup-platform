"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAssistantSettings,
  useSetAssistantSettings,
} from "@/hooks/use-assistant-settings";
import type { ReasoningEffort } from "@/lib/assistant/types";

const MODELS = ["gpt-5.4-mini", "gpt-5.4"];
const EFFORTS: ReasoningEffort[] = ["low", "medium", "high"];

export function AssistantSettingsCard() {
  const { data: settings, isLoading, isError } = useAssistantSettings();
  const setSettings = useSetAssistantSettings();
  const [limitInput, setLimitInput] = useState(String(settings.dailyLimit));
  const [turnsInput, setTurnsInput] = useState(String(settings.historyTurns));

  useEffect(() => {
    // Sync the editable copies after load/save, not while the admin types.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimitInput(String(settings.dailyLimit));
    setTurnsInput(String(settings.historyTurns));
  }, [settings.dailyLimit, settings.historyTurns]);

  const commitInt = (
    raw: string,
    current: number,
    min: number,
    max: number,
    key: "dailyLimit" | "historyTurns",
    reset: (v: string) => void
  ) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) return reset(String(current));
    const clamped = Math.min(max, Math.max(min, parsed));
    if (clamped !== current) setSettings.mutate({ [key]: clamped });
    else reset(String(clamped));
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Startie assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Couldn&apos;t load Startie settings — refresh to try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const busy = isLoading || setSettings.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Startie assistant</CardTitle>
        <CardDescription>
          The student chat widget. Changes apply on the next message.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="assistant-enabled">Enabled</Label>
            <p className="text-muted-foreground text-sm">
              Kill switch — hides the widget and stops replies
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-[1.15rem] w-8 rounded-full" />
          ) : (
            <Switch
              id="assistant-enabled"
              checked={settings.enabled}
              disabled={busy}
              onCheckedChange={(checked) =>
                setSettings.mutate({ enabled: checked })
              }
            />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="assistant-model">Model</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={settings.model}
                disabled={busy}
                onValueChange={(model) => setSettings.mutate({ model })}
              >
                <SelectTrigger id="assistant-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[...new Set([...MODELS, settings.model])].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assistant-effort">Reasoning effort</Label>
            {isLoading ? (
              <Skeleton className="h-9 w-full" />
            ) : (
              <Select
                value={settings.reasoningEffort}
                disabled={busy}
                onValueChange={(v) =>
                  setSettings.mutate({ reasoningEffort: v as ReasoningEffort })
                }
              >
                <SelectTrigger id="assistant-effort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EFFORTS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assistant-limit">
              Messages per student per day
            </Label>
            <Input
              id="assistant-limit"
              type="number"
              min={1}
              max={200}
              value={limitInput}
              disabled={busy}
              onChange={(e) => setLimitInput(e.target.value)}
              onBlur={() =>
                commitInt(
                  limitInput,
                  settings.dailyLimit,
                  1,
                  200,
                  "dailyLimit",
                  setLimitInput
                )
              }
            />
            <p className="text-muted-foreground text-xs">
              Resets at 00:00 UTC. Admins are exempt.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assistant-turns">
              History turns sent to the model
            </Label>
            <Input
              id="assistant-turns"
              type="number"
              min={2}
              max={30}
              value={turnsInput}
              disabled={busy}
              onChange={(e) => setTurnsInput(e.target.value)}
              onBlur={() =>
                commitInt(
                  turnsInput,
                  settings.historyTurns,
                  2,
                  30,
                  "historyTurns",
                  setTurnsInput
                )
              }
            />
            <p className="text-muted-foreground text-xs">
              Fewer turns = cheaper, shorter memory within a chat.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
