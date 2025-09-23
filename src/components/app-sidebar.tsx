"use client";

import * as React from "react";
import { useApp } from "@/contexts/app-context";
import {
  BarChart3,
  Trophy,
  User,
  Users,
  FileText,
  Command,
} from "lucide-react";

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

const navMainItems = [
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
  },
  {
    title: "Team Journey",
    url: "/dashboard/team-journey",
    icon: Users,
  },
  {
    title: "Peer Review",
    url: "/dashboard/peer-review",
    icon: FileText,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useApp();

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    StartSchool Module
                  </span>
                  <span className="truncate text-xs">Batch 1</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMainItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && (
          <NavUser 
            user={{
              name: user.name || 'User',
              email: user.email,
              avatar: user.avatar_url || '/avatars/shadcn.jpg'
            }} 
          />
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
