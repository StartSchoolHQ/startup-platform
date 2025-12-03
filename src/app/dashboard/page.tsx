"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileText,
  WandSparkles,
  Star,
  Trophy,
  CheckCircle2,
} from "lucide-react";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual-weekly-report-modal";
import { hasUserSubmittedThisWeekIndividual } from "@/lib/weekly-reports";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { TeamItem } from "@/components/dashboard/team-item";
import { ActivityItem } from "@/components/dashboard/activity-item";
import { BorderedContainer } from "@/components/dashboard/bordered-container";
import { IconContainer } from "@/components/dashboard/icon-container";
import { StatItem } from "@/components/dashboard/stat-item";
import {
  getStatsCards,
  getTeamProgressData,
  getPersonalProgressData,
} from "@/data/dashboard-data";
import { useState, useEffect, useCallback } from "react";
import {
  StatsCard,
  TeamProgressData,
  PersonalProgressData,
} from "@/types/dashboard";

export default function OverviewPage() {
  const { firstName, user } = useApp();
  const [statsCards, setStatsCards] = useState<StatsCard[]>([]);
  const [teamProgressData, setTeamProgressData] =
    useState<TeamProgressData | null>(null);
  const [personalProgressData, setPersonalProgressData] =
    useState<PersonalProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isIndividualReportModalOpen, setIsIndividualReportModalOpen] =
    useState(false);
  const [hasSubmittedThisWeek, setHasSubmittedThisWeek] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!user?.id) return;

    try {
      const [stats, teamData, personalData, submissionStatus] =
        await Promise.all([
          getStatsCards(user.id),
          getTeamProgressData(user.id),
          getPersonalProgressData(user.id),
          hasUserSubmittedThisWeekIndividual(user.id),
        ]);

      setStatsCards(stats);
      setTeamProgressData(teamData);
      setPersonalProgressData(personalData);
      setHasSubmittedThisWeek(submissionStatus);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
        <p className="text-muted-foreground">
          Here you can see progress for you and your team
        </p>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((card, index) => (
          <StatsCardComponent
            key={index}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            iconColor={card.iconColor}
          />
        ))}
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teamProgressData && <TeamProgressCard data={teamProgressData} />}
        {personalProgressData && (
          <PersonalProgressCard
            data={personalProgressData}
            hasSubmittedThisWeek={hasSubmittedThisWeek}
            onOpenReportModal={() => setIsIndividualReportModalOpen(true)}
          />
        )}
      </div>

      {/* Individual Weekly Report Modal */}
      {user?.id && (
        <IndividualWeeklyReportModal
          open={isIndividualReportModalOpen}
          onOpenChange={setIsIndividualReportModalOpen}
          userId={user.id}
          onSuccess={loadDashboardData}
        />
      )}
    </div>
  );
}

// Progress card component for teams
function TeamProgressCard({ data }: { data: TeamProgressData }) {
  const router = useRouter();
  // Get the first team name for the title, or use default
  const teamName = data.teams.length > 0 ? data.teams[0].name : "Your Teams";
  const cardTitle =
    data.teams.length === 1
      ? `${teamName} Team Progress`
      : "Your Teams Progress";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={Users}
            iconColor="text-black dark:text-white"
            backgroundColor="bg-gray-100 dark:bg-gray-800"
          />
          <CardTitle className="text-lg font-semibold">{cardTitle}</CardTitle>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/dashboard/team-journey")}
        >
          {data.joinTeamsText}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {!data.hasTeams ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">
              You are not a part of any team yet
            </p>
          </div>
        ) : (
          <>
            {/* Stats row - only show aggregate totals if multiple teams */}
            {data.stats.length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {data.stats.map((stat, index) => (
                  <StatItem key={index} stat={stat} />
                ))}
              </div>
            )}

            {/* Team member stats - show for each team */}
            {data.teams.map((team) => (
              <div key={team.id}>
                {data.teams.length > 1 && (
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                    {team.name}
                  </h3>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <TeamItem
                    stat={{
                      value: team.memberCount.toString(),
                      label: "Members",
                      icon: Users,
                      iconColor: "text-black dark:text-white",
                    }}
                  />
                  <TeamItem
                    stat={{
                      value: team.completedTasks.toString(),
                      label: "Tasks Completed",
                      icon: CheckCircle2,
                      iconColor: "text-black dark:text-white",
                    }}
                  />
                  <TeamItem
                    stat={{
                      value: team.totalPoints.toString(),
                      label: "Team Points",
                      icon: Star,
                      iconColor: "text-black dark:text-white",
                    }}
                  />
                  <TeamItem
                    stat={{
                      value: team.totalXP.toString(),
                      label: "Team XP",
                      icon: Trophy,
                      iconColor: "text-black dark:text-white",
                    }}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Progress card component for personal
function PersonalProgressCard({
  data,
  hasSubmittedThisWeek,
  onOpenReportModal,
}: {
  data: PersonalProgressData;
  hasSubmittedThisWeek: boolean;
  onOpenReportModal: () => void;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={Users}
            iconColor="text-black dark:text-white"
            backgroundColor="bg-gray-100 dark:bg-gray-800"
          />
          <CardTitle className="text-lg font-semibold">{data.title}</CardTitle>
        </div>
        <div className="w-[80px]"></div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          {data.stats.map((stat, index) => (
            <StatItem key={index} stat={stat} />
          ))}
        </div>

        {/* Activities */}
        <div className="grid grid-cols-2 gap-4">
          {data.activities.map((activity, index) => (
            <ActivityItem key={index} activity={activity} />
          ))}
        </div>

        {/* Action buttons */}
        <BorderedContainer className="justify-center w-full">
          <Button
            variant="outline"
            size="sm"
            className="h-10 grow"
            disabled={hasSubmittedThisWeek}
            onClick={onOpenReportModal}
          >
            <FileText className="h-4 w-4 mr-2" />
            {hasSubmittedThisWeek ? "Report Submitted" : "Submit Weekly Report"}
          </Button>
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 h-10 grow"
            onClick={() => router.push("/dashboard/my-journey")}
            disabled
          >
            <WandSparkles className="h-4 w-4 mr-2" />
            View Progress
          </Button>
        </BorderedContainer>
      </CardContent>
    </Card>
  );
}
