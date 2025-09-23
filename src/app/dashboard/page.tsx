"use client";

import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, FileText, WandSparkles } from "lucide-react";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { TeamItem } from "@/components/dashboard/team-item";
import { ActivityItem } from "@/components/dashboard/activity-item";
import { BorderedContainer } from "@/components/dashboard/bordered-container";
import { IconContainer } from "@/components/dashboard/icon-container";
import { StatItem } from "@/components/dashboard/stat-item";
import {
  statsCards,
  teamProgressData,
  personalProgressData,
} from "@/data/dashboard-data";

// Progress card component for teams
function TeamProgressCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={Users}
            iconColor="text-blue-600"
            backgroundColor="bg-blue-100"
          />
          <CardTitle className="text-lg font-semibold">
            {teamProgressData.title}
          </CardTitle>
        </div>
        <Button variant="outline" size="sm">
          {teamProgressData.joinTeamsText}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          {teamProgressData.stats.map((stat, index) => (
            <StatItem key={index} stat={stat} />
          ))}
        </div>

        {/* Teams list */}
        <div className="grid grid-cols-2 gap-4">
          {teamProgressData.teams.map((team, index) => (
            <TeamItem key={index} team={team} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Progress card component for personal
function PersonalProgressCard() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="flex items-center gap-3">
          <IconContainer
            icon={Users}
            iconColor="text-pink-600"
            backgroundColor="bg-pink-100"
          />
          <CardTitle className="text-lg font-semibold">
            {personalProgressData.title}
          </CardTitle>
        </div>
        <div className="w-[80px]"></div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4">
          {personalProgressData.stats.map((stat, index) => (
            <StatItem key={index} stat={stat} />
          ))}
        </div>

        {/* Activities */}
        <div className="grid grid-cols-2 gap-4">
          {personalProgressData.activities.map((activity, index) => (
            <ActivityItem key={index} activity={activity} />
          ))}
        </div>

        {/* Action buttons */}
        <BorderedContainer className="justify-center w-full">
          <Button variant="outline" size="sm" className="h-10 grow">
            <FileText className="h-4 w-4 mr-2" />
            Submit Weekly Report
          </Button>
          <Button
            size="sm"
            className="bg-black text-white hover:bg-gray-800 h-10 grow"
          >
            <WandSparkles className="h-4 w-4 mr-2" />
            View Progress
          </Button>
        </BorderedContainer>
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const { firstName } = useApp();

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
        <TeamProgressCard />
        <PersonalProgressCard />
      </div>
    </div>
  );
}
