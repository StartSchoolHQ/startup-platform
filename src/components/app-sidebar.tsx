"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useApp } from "@/contexts/app-context";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Trophy,
  User,
  Users,
  FileText,
  Settings,
  HelpCircle,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import {
  usePlatformSettings,
  type JourneySettings,
} from "@/hooks/use-platform-settings";

import { NotificationCenter } from "@/components/notification-center";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavMainItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  /** When set, the item only shows while that journey is enabled. */
  journey?: keyof JourneySettings;
};

const navMainItems: NavMainItem[] = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: BarChart3,
  },
  {
    title: "Leaderboard",
    url: "/dashboard/leaderboard",
    icon: Trophy,
  },
  {
    title: "My Journey",
    url: "/dashboard/my-journey",
    icon: User,
    journey: "myJourney",
  },
  {
    title: "All Teams",
    url: "/dashboard/team-journey",
    icon: Users,
    journey: "teamJourney",
  },
  {
    title: "Peer Review",
    url: "/dashboard/peer-review",
    icon: FileText,
  },
  {
    title: "Support",
    url: "/dashboard/support",
    icon: HelpCircle,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useApp();
  const { data: journeys } = usePlatformSettings();
  const isAdmin = user?.primary_role === "admin";

  // Fetch user's team for dynamic nav link
  const { data: userTeam } = useQuery({
    queryKey: ["userTeamNav", user?.id],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("team_members")
        .select("team_id, teams(id, name)")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      if (!data?.teams) return null;
      const team = data.teams as unknown as { id: string; name: string };
      return { id: team.id, name: team.name };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Memoize navigation items to prevent flickering
  const navigationItems = React.useMemo(() => {
    // Admins see every item regardless of the current programme phase.
    const baseItems: NavMainItem[] = navMainItems.filter(
      (item) => isAdmin || !item.journey || journeys[item.journey]
    );

    // Insert dynamic team link after Leaderboard
    if (userTeam && (isAdmin || journeys.teamJourney)) {
      const leaderboardIndex = baseItems.findIndex(
        (item) => item.url === "/dashboard/leaderboard"
      );
      const teamItem = {
        title: `${userTeam.name} Team`,
        url: `/dashboard/team-journey/${userTeam.id}`,
        icon: Rocket,
      };
      baseItems.splice(leaderboardIndex + 1, 0, teamItem);
    }

    // Add admin section if user is admin (show whenever role is available)
    if (isAdmin) {
      return [
        ...baseItems,
        {
          title: "Admin",
          url: "/dashboard/admin",
          icon: Settings,
          items: [
            { title: "Analytics", url: "/dashboard/admin/analytics" },
            { title: "Agreements", url: "/dashboard/admin/agreements" },
            {
              title: "Laptops & Keycards",
              url: "/dashboard/admin/laptops-keycards",
            },
            { title: "Users", url: "/dashboard/admin/users" },
            { title: "Teams", url: "/dashboard/admin/teams" },
            { title: "Peer Reviews", url: "/dashboard/admin/peer-reviews" },
            {
              title: "Weekly Reports",
              url: "/dashboard/admin/weekly-reports",
            },
            { title: "Progress", url: "/dashboard/admin/progress" },
            { title: "Diplomas", url: "/dashboard/admin/diplomas" },
          ],
        },
      ];
    }

    return baseItems;
    // Only recreate when admin role, team or programme phase changes
  }, [isAdmin, userTeam, journeys]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex w-full items-center justify-between px-2">
              <SidebarMenuButton size="lg" asChild className="flex-1">
                <Link href="/dashboard">
                  <div className="flex w-full items-center justify-center">
                    <Image
                      src="/images/startschool-logo.png"
                      alt="StartSchool"
                      width={132}
                      height={34}
                      className="h-8 w-auto object-contain"
                      priority
                    />
                  </div>
                </Link>
              </SidebarMenuButton>
              <div className="ml-2 flex-shrink-0">
                <NotificationCenter />
              </div>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navigationItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser
            user={{
              name: user.name || "User",
              email: user.email,
              avatar: user.avatar_url || "/avatars/shadcn.jpg",
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
