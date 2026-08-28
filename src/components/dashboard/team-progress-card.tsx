"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, CheckCircle2, CreditCard, Zap, Building2 } from "lucide-react";
import { TeamItem, StatItem } from "@/components/dashboard/dashboard-items";
import { IconContainer } from "@/components/dashboard/icon-container";
import { TeamProgressData } from "@/types/dashboard";

// Progress card component for teams
export function TeamProgressCard({ data }: { data: TeamProgressData }) {
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
              <Users className="text-muted-foreground mb-3 h-10 w-10" />
              <p className="text-muted-foreground mb-1 font-medium">
                No team yet
              </p>
              <p className="text-muted-foreground mb-4 text-sm">
                Join a team to start collaborating
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/dashboard/team-journey")}
              >
                Browse Teams
              </Button>
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

// TODO: Re-enable PersonalProgressCard for full release
/* function PersonalProgressCard({
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
          <div className="grid grid-cols-2 gap-4">
            {data.stats.map((stat, index) => (
              <StatItem key={index} stat={stat} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {data.activities.map((activity, index) => (
              <ActivityItem key={index} activity={activity} />
            ))}
          </div>
        </div>

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
} */
