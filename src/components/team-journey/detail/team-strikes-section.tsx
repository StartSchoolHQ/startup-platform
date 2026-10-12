"use client";

import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { StrikesTable } from "@/components/team-journey/strikes-table";
import { cn } from "@/lib/utils";
import type { TeamStrike } from "@/lib/team-journey/detail-transforms";

const MAX_STRIKES = 5;

/** Strikes as a card: a dot per strike in the label, then the table. */
export function TeamStrikesSection({
  id,
  strikes,
  strikesCount,
  isTeamMember,
  onExplain,
}: {
  id: string;
  strikes: TeamStrike[];
  strikesCount: number;
  isTeamMember: boolean;
  onExplain: (strike: TeamStrike) => void;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 p-5">
          <SectionLabel
            icon={AlertTriangle}
            title="Strikes"
            aside={
              <span className="flex items-center gap-2">
                <span className="flex gap-1" aria-hidden>
                  {Array.from({ length: MAX_STRIKES }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-2 w-2 rounded-full",
                        i < strikesCount ? "bg-destructive" : "bg-muted"
                      )}
                    />
                  ))}
                </span>
                {strikesCount} of {MAX_STRIKES}
              </span>
            }
          />
          {strikes.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No strikes. Keep the weekly reports coming.
            </p>
          ) : (
            <StrikesTable
              isTeamMember={isTeamMember}
              strikes={strikes}
              onExplainClick={onExplain}
            />
          )}
        </div>
      </Card>
    </section>
  );
}
