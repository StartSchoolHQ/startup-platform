"use client";

import { Handshake, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { ClientMeetingsTable } from "@/components/team-journey/client-meetings-table";
import { MEETINGS_TO_UNLOCK } from "@/hooks/use-team-detail";

/** Client meetings as a card below the tasks, with the unlock count. */
export function TeamMeetingsSection({
  id,
  teamId,
  isTeamMember,
  meetingsCount,
  onAdd,
}: {
  id: string;
  teamId: string;
  isTeamMember: boolean;
  meetingsCount: number;
  onAdd: () => void;
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <Card className="gap-0 py-0">
        <div className="flex flex-col gap-4 p-5">
          <SectionLabel
            icon={Handshake}
            title="Client meetings"
            aside={
              <span className="flex items-center gap-3">
                <span>
                  {meetingsCount} logged
                  {meetingsCount < MEETINGS_TO_UNLOCK &&
                    ` · ${MEETINGS_TO_UNLOCK} unlock the tasks`}
                </span>
                {isTeamMember && (
                  <Button size="sm" className="-my-1 h-7" onClick={onAdd}>
                    <Plus className="h-3.5 w-3.5" />
                    Add meeting
                  </Button>
                )}
              </span>
            }
          />
          <ClientMeetingsTable teamId={teamId} isTeamMember={isTeamMember} />
        </div>
      </Card>
    </section>
  );
}
