"use client";

import { useRouter } from "next/navigation";
import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Users,
  FileText,
  WandSparkles,
  CheckCircle2,
  Zap,
  CreditCard,
  Building2,
  User,
} from "lucide-react";
import { IndividualWeeklyReportModal } from "@/components/weekly-reports/individual-weekly-report-modal";
import { hasUserSubmittedThisWeekIndividual } from "@/lib/weekly-reports";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import {
  TeamItem,
  ActivityItem,
  StatItem,
} from "@/components/dashboard/dashboard-items";
import { BorderedContainer } from "@/components/dashboard/bordered-container";
import { IconContainer } from "@/components/dashboard/icon-container";
import { StatsGridSkeleton } from "@/components/ui/stats-grid-skeleton";
import {
  getStatsCards,
  getTeamProgressData,
  getPersonalProgressData,
} from "@/data/dashboard-data";
// Onborda disabled temporarily — uncomment to re-enable
// import { DashboardTourTrigger } from "@/components/onboarding/dashboard-tour-trigger";
import { useState } from "react";
import {
  StatsCard,
  TeamProgressData,
  PersonalProgressData,
} from "@/types/dashboard";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function OverviewPage() {
  const { firstName, user } = useApp();
  const queryClient = useQueryClient();
  const [isIndividualReportModalOpen, setIsIndividualReportModalOpen] =
    useState(false);

  // React Query: Stats cards
  const { data: statsCards = [], isPending: isLoadingStats } = useQuery({
    queryKey: ["dashboard", "stats", user?.id],
    queryFn: () => getStatsCards(user!.id),
    enabled: !!user?.id,
  });

  // React Query: Team progress
  const { data: teamProgressData, isPending: isLoadingTeam } = useQuery({
    queryKey: ["dashboard", "teamProgress", user?.id],
    queryFn: () => getTeamProgressData(user!.id),
    enabled: !!user?.id,
  });

  // React Query: Personal progress
  // TODO: Re-enable for full release
  // const { data: personalProgressData, isPending: isLoadingPersonal } = useQuery(
  //   {
  //     queryKey: ["dashboard", "personalProgress", user?.id],
  //     queryFn: () => getPersonalProgressData(user!.id),
  //     enabled: !!user?.id,
  //   }
  // );
  const personalProgressData = null;
  const isLoadingPersonal = false;

  // React Query: Weekly report submission status
  const { data: hasSubmittedThisWeek = false, isPending: isLoadingSubmission } =
    useQuery({
      queryKey: ["dashboard", "weeklySubmission", user?.id],
      queryFn: () => hasUserSubmittedThisWeekIndividual(user!.id),
      enabled: !!user?.id,
    });

  const loading =
    isLoadingStats || isLoadingTeam || isLoadingPersonal || isLoadingSubmission;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
        <StatsGridSkeleton />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="bg-accent h-64 animate-pulse rounded-lg" />
          <div className="bg-accent h-64 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <DashboardTourTrigger /> */}
      {/* Header section */}
      <div>
        <h1 className="text-2xl font-bold">Hi {firstName} 👋</h1>
        <p className="text-muted-foreground">
          Here you can see progress for you and your team
        </p>
      </div>

      {/* Stats cards grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <motion.div
            key={index}
            id={card.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: index * 0.05,
            }}
          >
            <StatsCardComponent
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              iconColor={card.iconColor}
            />
          </motion.div>
        ))}
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {teamProgressData && <TeamProgressCard data={teamProgressData} />}
        {/* TODO: Re-enable Personal Progress for full release */}
        {/* {personalProgressData && (
          <PersonalProgressCard
            data={personalProgressData}
            hasSubmittedThisWeek={hasSubmittedThisWeek}
            onOpenReportModal={() => setIsIndividualReportModalOpen(true)}
          />
        )} */}
      </div>

      {/* Individual Weekly Report Modal */}
      {/* TODO: Re-enable for full release */}
      {/* {user?.id && (
        <IndividualWeeklyReportModal
          open={isIndividualReportModalOpen}
          onOpenChange={setIsIndividualReportModalOpen}
          userId={user.id}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["dashboard"] });
          }}
        />
      )} */}
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
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={Building2}
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
      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6">
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
                    <h3 className="text-muted-foreground mb-3 text-sm font-semibold">
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
                        icon: CreditCard,
                        iconColor: "text-black dark:text-white",
                      }}
                    />
                    <TeamItem
                      stat={{
                        value: team.totalXP.toString(),
                        label: "Team XP",
                        icon: Zap,
                        iconColor: "text-black dark:text-white",
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
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
    <Card className="flex h-full flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={User}
            iconColor="text-black dark:text-white"
            backgroundColor="bg-gray-100 dark:bg-gray-800"
          />
          <CardTitle className="text-lg font-semibold">{data.title}</CardTitle>
        </div>
        <div className="w-[80px]"></div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <div className="flex-1 space-y-6">
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
        </div>

        {/* Action buttons */}
        <div className="mt-6">
          <BorderedContainer className="w-full justify-center">
            <Button
              variant="outline"
              size="sm"
              className="h-10 grow"
              disabled={true}
              onClick={onOpenReportModal}
            >
              <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {hasSubmittedThisWeek
                  ? "Report Submitted"
                  : "Submit Personal Weekly Report"}
              </span>
            </Button>
            <Button
              size="sm"
              className="bg-foreground text-background hover:bg-foreground/90 h-10 grow"
              onClick={() => router.push("/dashboard/my-journey")}
              disabled
            >
              <WandSparkles className="mr-2 h-4 w-4 flex-shrink-0" />
              <span className="truncate">View Progress</span>
            </Button>
          </BorderedContainer>
        </div>
      </CardContent>
    </Card>
  );
}
