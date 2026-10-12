"use client";

import Link from "next/link";
import { use, useState } from "react";
import { redirect } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CreditCard, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { TeamDetailSkeleton } from "@/components/ui/team-detail-skeleton";
import {
  TeamHeader,
  MANAGER_ROLES,
} from "@/components/team-journey/detail/team-header";
import { TeamWeeklyReportCard } from "@/components/team-journey/detail/team-weekly-report-card";
import { TeamMembersCard } from "@/components/team-journey/detail/team-members-card";
import { HowTeamJourneyWorksCard } from "@/components/team-journey/detail/how-team-journey-works-card";
import { TeamTasksSection } from "@/components/team-journey/detail/team-tasks-section";
import { TeamMeetingsSection } from "@/components/team-journey/detail/team-meetings-section";
import { TeamStrikesSection } from "@/components/team-journey/detail/team-strikes-section";
import { TeamReportsSection } from "@/components/team-journey/detail/team-reports-section";
import { TeamManagementModal } from "@/components/team-journey/team-management-modal";
import { AddClientMeetingModal } from "@/components/team-journey/add-client-meeting-modal";
import { ExplainStrikeModal } from "@/components/team-journey/explain-strike-modal";
// V2 look (2026-09-14); V1 kept at weekly-reports/weekly-report-modal.tsx for rollback.
import { WeeklyReportModal } from "@/components/weekly-reports/team/weekly-report-modal-v2";
import { useAppContext } from "@/contexts/app-context";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import { useTeamDetail } from "@/hooks/use-team-detail";
import { useTeamTaskActions } from "@/hooks/use-team-task-actions";
import { economyLabels } from "@/lib/economy-labels";
import type { TeamStrike } from "@/lib/team-journey/detail-transforms";

const labels = economyLabels("team");

type Modal = "teamManagement" | "weeklyReport" | "addMeeting" | "explainStrike";

/**
 * One team's page in My Journey's shape (2026-10-12): header, stat row with
 * the weekly report card, members + how it works, then Tasks, Client
 * meetings, Strikes and Past reports as sections instead of tabs.
 */
export default function TeamDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id: teamId } = use(props.params);
  const { user, loading: userLoading } = useAppContext();
  const {
    data: journeys,
    isLoading: journeysLoading,
    isError: journeysError,
  } = usePlatformSettings();
  const queryClient = useQueryClient();

  const [modal, setModal] = useState<Modal | null>(null);
  const [selectedStrike, setSelectedStrike] = useState<TeamStrike | null>(null);
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const d = useTeamDetail(teamId, user?.id, userLoading);
  const actions = useTeamTaskActions({
    teamId,
    teamName: d.team?.name ?? "",
    user: user
      ? { id: user.id, name: user.name, avatar_url: user.avatar_url }
      : null,
    members: d.members,
    tasks: d.tasks,
  });

  // Journey guard: students lose the team pages while the Team Journey phase
  // is off. Admins always keep access. Only a successful settings read may
  // redirect — a failed fetch falls back to JOURNEY_DEFAULTS and must never
  // bounce anyone off the page. Runs after every hook so hook order is stable.
  const settingsSettled = !journeysLoading && !userLoading;
  const guardReady = settingsSettled && !journeysError;
  if (guardReady && !journeys.teamJourney && user?.primary_role !== "admin") {
    redirect("/dashboard");
  }

  if (d.loadingTeam || !settingsSettled) {
    return <TeamDetailSkeleton />;
  }

  if (!d.team) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertTriangle className="text-muted-foreground h-10 w-10" />
        <div className="text-center">
          <h2 className="text-lg font-semibold">Team not found</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            This team may have been removed or you don&apos;t have access.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/team-journey">Back to Team Journey</Link>
        </Button>
      </div>
    );
  }

  const team = d.team;
  const canManage =
    d.isTeamMember && !!d.userRole && MANAGER_ROLES.includes(d.userRole);
  const thisWeekId = d.weekBoundaries
    ? `${d.weekBoundaries.week_year}-${d.weekBoundaries.week_number}`
    : null;
  const scrollTo = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-6">
      <TeamHeader
        name={team.name}
        description={team.description}
        logoUrl={team.logo_url}
        website={team.website}
        status={team.status}
        isTeamMember={d.isTeamMember}
        userRole={d.userRole}
        onManage={() => setModal("teamManagement")}
      />

      {/* Top row as on My Journey: two stat cards, then this week's report
          taking two columns. */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCardComponent
          title={labels.xp}
          value={d.stats.xpEarned.toLocaleString()}
          subtitle="From tasks, meetings and reports"
          icon={Zap}
          iconColor="text-primary"
        />
        <StatsCardComponent
          title={labels.points}
          value={d.stats.pointsEarned.toLocaleString()}
          subtitle={`${d.stats.pointsInvested.toLocaleString()} invested so far`}
          icon={CreditCard}
          iconColor="text-primary"
        />
        <div className="md:col-span-2">
          <TeamWeeklyReportCard
            members={d.members.map((m) => ({
              user_id: m.user_id,
              name: m.users?.name ?? null,
              avatar_url: m.users?.avatar_url ?? null,
            }))}
            submissionStatus={d.memberSubmissionStatus}
            week={d.weekBoundaries}
            isTeamMember={d.isTeamMember}
            hasSubmitted={d.hasSubmittedThisWeek}
            onWrite={() => setModal("weeklyReport")}
            onView={() => {
              setOpenReportId(thisWeekId);
              scrollTo("reports");
            }}
            onHistory={() => scrollTo("reports")}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TeamMembersCard
          members={d.members}
          canManage={canManage}
          onManage={() => setModal("teamManagement")}
        />
        <HowTeamJourneyWorksCard />
      </div>

      <TeamTasksSection
        id="tasks"
        achievements={d.achievements}
        tasks={d.tasks}
        loading={d.loadingAchievements}
        unlocked={d.achievementsUnlocked}
        meetingsCount={d.meetingsCount}
        isTeamMember={d.isTeamMember}
        members={d.members}
        currentUserId={user?.id}
        onAssign={(taskId, userId) => actions.assign.mutate({ taskId, userId })}
        onStart={(taskId) => actions.start.mutate({ taskId })}
      />

      <TeamMeetingsSection
        id="meetings"
        teamId={team.id}
        isTeamMember={d.isTeamMember}
        meetingsCount={d.meetingsCount}
        onAdd={() => setModal("addMeeting")}
      />

      <TeamStrikesSection
        id="strikes"
        strikes={d.strikes}
        strikesCount={team.strikes_count ?? 0}
        isTeamMember={d.isTeamMember}
        onExplain={(strike) => {
          setSelectedStrike(strike);
          setModal("explainStrike");
        }}
      />

      <TeamReportsSection
        id="reports"
        reports={d.weeklyReports}
        openReportId={openReportId}
        onOpenReportChange={setOpenReportId}
      />

      {d.userRole && (
        <TeamManagementModal
          isOpen={modal === "teamManagement"}
          onClose={() => setModal(null)}
          team={{
            id: team.id,
            name: team.name,
            description: team.description,
            website: team.website,
            logo_url: team.logo_url,
            members: d.members.map((m) => ({
              user_id: m.user_id,
              team_role: m.team_role || "member",
              joined_at: m.joined_at || new Date().toISOString(),
              users: m.users,
            })),
          }}
          userRole={d.userRole}
          currentUserId={user?.id}
          onRefresh={() =>
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "detail", teamId],
            })
          }
        />
      )}
      {user?.id && (
        <WeeklyReportModal
          open={modal === "weeklyReport"}
          onOpenChange={(open) => setModal(open ? "weeklyReport" : null)}
          teamId={team.id}
          userId={user.id}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "weeklySubmission", teamId, user.id],
            });
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "memberSubmissions", teamId],
            });
            queryClient.invalidateQueries({
              queryKey: ["teamJourney", "weeklyReports", teamId],
            });
          }}
        />
      )}
      <AddClientMeetingModal
        open={modal === "addMeeting"}
        onOpenChange={(open) => setModal(open ? "addMeeting" : null)}
        teamId={team.id}
      />
      {selectedStrike && (
        <ExplainStrikeModal
          open={modal === "explainStrike"}
          onOpenChange={(open) => setModal(open ? "explainStrike" : null)}
          strike={selectedStrike}
          teamId={team.id}
        />
      )}
    </div>
  );
}
