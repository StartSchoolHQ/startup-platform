"use client";

import { MeetingsTab } from "../meetings-tab";
import { OverviewTab } from "../overview-tab";
import { ProgramAccountability } from "../program-accountability";
import { StudentsTab } from "../students-tab";
import { TeamsTab } from "../teams-tab";
import { MilestonesSection } from "./milestones-section";

interface Props {
  active: boolean;
  batchId: string | null;
}

/**
 * Team Journey: how teams feel and what they achieve. The sentiment,
 * teams, students, meetings and accountability views are the pre-existing
 * components, composed here; milestones (conversations + revenue) is new.
 */
export function TeamJourneyTab({ active, batchId }: Props) {
  return (
    <div className="space-y-8">
      <Section title="How teams feel">
        <OverviewTab active={active} batchId={batchId} />
      </Section>
      <Section title="Milestones">
        <MilestonesSection active={active} batchId={batchId} />
      </Section>
      <Section title="Teams">
        <TeamsTab active={active} batchId={batchId} />
      </Section>
      <Section title="Students in teams">
        <StudentsTab active={active} batchId={batchId} />
      </Section>
      <Section title="Customer meetings in detail">
        <MeetingsTab active={active} batchId={batchId} />
      </Section>
      <Section title="Strikes and points">
        <ProgramAccountability active={active} batchId={batchId} />
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}
