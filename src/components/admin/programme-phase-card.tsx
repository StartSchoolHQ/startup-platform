"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePlatformSettings,
  useSetJourneys,
  type JourneySettings,
} from "@/hooks/use-platform-settings";

const PHASE_ROWS: {
  id: keyof JourneySettings;
  label: string;
  helper: string;
}[] = [
  {
    id: "myJourney",
    label: "My Journey",
    helper: "Hides the My Journey link, board and dashboard card",
  },
  {
    id: "teamJourney",
    label: "Team Journey",
    helper:
      "Hides Team Journey pages, boards, card and pauses weekly reports & strikes",
  },
];

export function ProgrammePhaseCard() {
  const { data: settings, isLoading } = usePlatformSettings();
  const setJourneys = useSetJourneys();

  const handleToggle = (id: keyof JourneySettings, checked: boolean) => {
    setJourneys.mutate({ ...settings, [id]: checked });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Programme Phase</CardTitle>
        <CardDescription>
          Controls which economy students see. Admins always see both.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PHASE_ROWS.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor={`phase-${row.id}`}>{row.label}</Label>
              <p className="text-muted-foreground text-sm">{row.helper}</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-[1.15rem] w-8 rounded-full" />
            ) : (
              <Switch
                id={`phase-${row.id}`}
                checked={settings[row.id]}
                disabled={setJourneys.isPending}
                onCheckedChange={(checked) => handleToggle(row.id, checked)}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
