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
  useProgramAssistantSettings,
  useSetProgramAssistantSettings,
} from "@/hooks/use-program-assistant-settings";

const MODELS = ["claude-sonnet-5-5", "claude-opus-5-5"];

type NumKey = "attendanceRulePct" | "attendanceMinSessions" | "unmappedFailPct";

const NUM_FIELDS: Array<{
  key: NumKey;
  label: string;
  help: string;
  min: number;
  max: number;
}> = [
  {
    key: "attendanceRulePct",
    label: "Attendance rule (%)",
    help: "Below this cumulative attendance a student is Talk to",
    min: 0,
    max: 100,
  },
  {
    key: "attendanceMinSessions",
    label: "Minimum sessions",
    help: "The attendance rule waits for this many sessions",
    min: 1,
    max: 200,
  },
  {
    key: "unmappedFailPct",
    label: "Unmapped limit (%)",
    help: "The run fails when more students than this lack a track row",
    min: 0,
    max: 100,
  },
];

export function ProgramAssistantSettingsCard() {
  const { data: s, isLoading, isError } = useProgramAssistantSettings();
  const set = useSetProgramAssistantSettings();
  const [drafts, setDrafts] = useState<Record<NumKey, string>>({
    attendanceRulePct: String(s.attendanceRulePct),
    attendanceMinSessions: String(s.attendanceMinSessions),
    unmappedFailPct: String(s.unmappedFailPct),
  });
  const [channel, setChannel] = useState(s.slackChannel);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrafts({
      attendanceRulePct: String(s.attendanceRulePct),
      attendanceMinSessions: String(s.attendanceMinSessions),
      unmappedFailPct: String(s.unmappedFailPct),
    });
    setChannel(s.slackChannel);
  }, [
    s.attendanceRulePct,
    s.attendanceMinSessions,
    s.unmappedFailPct,
    s.slackChannel,
  ]);

  const commit = (f: (typeof NUM_FIELDS)[number]) => {
    const parsed = parseInt(drafts[f.key], 10);
    if (!Number.isFinite(parsed)) {
      return setDrafts((d) => ({ ...d, [f.key]: String(s[f.key]) }));
    }
    const clamped = Math.min(f.max, Math.max(f.min, parsed));
    if (clamped !== s[f.key]) set.mutate({ [f.key]: clamped });
    else setDrafts((d) => ({ ...d, [f.key]: String(clamped) }));
  };

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Program assistant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Couldn&apos;t load the settings — refresh to try again.
          </p>
        </CardContent>
      </Card>
    );
  }
  const busy = isLoading || set.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program assistant</CardTitle>
        <CardDescription>
          The daily Qwasar + attendance check (08:00 Riga). Changes apply on the
          next run.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="pa-enabled">Enabled</Label>
            <p className="text-muted-foreground text-sm">
              Off = the schedule and Run now do nothing
            </p>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-11" />
          ) : (
            <Switch
              id="pa-enabled"
              checked={s.enabled}
              disabled={busy}
              onCheckedChange={(v) => set.mutate({ enabled: v })}
            />
          )}
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="pa-slack">Post digest to Slack</Label>
            <p className="text-muted-foreground text-sm">
              The digest is always generated; this posts it
            </p>
          </div>
          <Switch
            id="pa-slack"
            checked={s.slackEnabled}
            disabled={busy}
            onCheckedChange={(v) => set.mutate({ slackEnabled: v })}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="pa-channel">Slack channel</Label>
            <Input
              id="pa-channel"
              value={channel}
              disabled={busy}
              onChange={(e) => setChannel(e.target.value)}
              onBlur={() => {
                const v = channel.trim();
                if (v && v !== s.slackChannel) set.mutate({ slackChannel: v });
                else setChannel(s.slackChannel);
              }}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pa-model">Model for explanations</Label>
            <Select
              value={s.model}
              disabled={busy}
              onValueChange={(v) => set.mutate({ model: v })}
            >
              <SelectTrigger id="pa-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {NUM_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={`pa-${f.key}`}>{f.label}</Label>
              <Input
                id={`pa-${f.key}`}
                type="number"
                min={f.min}
                max={f.max}
                value={drafts[f.key]}
                disabled={busy}
                onChange={(e) =>
                  setDrafts((d) => ({ ...d, [f.key]: e.target.value }))
                }
                onBlur={() => commit(f)}
              />
              <p className="text-muted-foreground text-xs">{f.help}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
