"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Users, PackageOpen } from "lucide-react";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import {
  TeamGrid,
  TeamGridSkeleton,
} from "@/components/team-journey/team-grid";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { redirect, useSearchParams, useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/app-context";
import { usePlatformSettings } from "@/hooks/use-platform-settings";
import {
  getAllTeamsForJourney,
  getUserTeamsForJourney,
  getArchivedTeamsForJourney,
  transformTeamToProduct,
} from "@/lib/database";
import type { DatabaseTeam } from "@/lib/database";
import type { Product } from "@/types/team-journey";

const TABS = ["all", "mine", "archive"] as const;
type Tab = (typeof TABS)[number];

const toProducts = (teams: unknown, userId: string) =>
  (teams as DatabaseTeam[])
    .filter((team) => team && Array.isArray(team.team_members))
    .map((team) => transformTeamToProduct(team, userId));

/** Own teams first, then A→Z; search matches name or description. */
function visible(teams: Product[], query: string) {
  const q = query.trim().toLowerCase();
  const matched = q
    ? teams.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
      )
    : teams;
  return [...matched].sort((a, b) => {
    if (a.isCurrentUserMember !== b.isCurrentUserMember) {
      return a.isCurrentUserMember ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export default function TeamJourneyPage() {
  const { user, loading: userLoading } = useAppContext();
  const {
    data: journeys,
    isLoading: journeysLoading,
    isError: journeysError,
  } = usePlatformSettings();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const tabParam = searchParams.get("tab");
  const activeTab: Tab = TABS.includes(tabParam as Tab)
    ? (tabParam as Tab)
    : "all";

  const setActiveTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "all") params.delete("tab");
      else params.set("tab", tab);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : window.location.pathname, {
        scroll: false,
      });
    },
    [searchParams, router]
  );

  // Archived (closed-batch) teams stay admin-only on the first two tabs.
  const { data: allTeams = [], isPending: loadingAll } = useQuery({
    queryKey: ["teamJourney", "all", user?.id],
    queryFn: async () =>
      toProducts(
        await getAllTeamsForJourney(user!.id, { status: "active" }),
        user!.id
      ),
    enabled: !!user?.id,
  });

  const { data: myTeams = [], isPending: loadingMine } = useQuery({
    queryKey: ["teamJourney", "my", user?.id],
    queryFn: async () =>
      toProducts(
        await getUserTeamsForJourney(user!.id, { status: "active" }),
        user!.id
      ),
    enabled: !!user?.id,
  });

  const { data: archivedTeams = [], isPending: loadingArchived } = useQuery({
    queryKey: ["teamJourney", "archived", user?.id],
    queryFn: async () =>
      toProducts(await getArchivedTeamsForJourney(user!.id, {}), user!.id),
    enabled: !!user?.id,
  });

  // Debounced search so typing does not re-sort the grid on every key.
  useEffect(() => {
    const id = setTimeout(() => setQuery(searchInput), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const clearSearch = () => {
    setSearchInput("");
    setQuery("");
  };

  const lists = useMemo(
    () => ({
      all: visible(allTeams, query),
      mine: visible(myTeams, query),
      archive: visible(archivedTeams, query),
    }),
    [allTeams, myTeams, archivedTeams, query]
  );

  const noMatch = (what: string) => ({
    icon: Search,
    title: "No teams match",
    description: `Nothing in ${what} matches "${query}".`,
    action: { label: "Clear search", onClick: clearSearch },
  });

  // Journey guard: students lose this page while the Team Journey phase is
  // off. Admins always keep access. Only a successful settings read may
  // redirect — a failed fetch falls back to JOURNEY_DEFAULTS and must never
  // bounce anyone off the page.
  const settingsSettled = !journeysLoading && !userLoading;
  const guardReady = settingsSettled && !journeysError;
  if (guardReady && !journeys.teamJourney && user?.primary_role !== "admin") {
    redirect("/dashboard");
  }
  if (!settingsSettled) {
    return <TeamGridSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Team Journey
          </h1>
          <p className="text-muted-foreground max-w-2xl text-sm">
            Every team in the programme. Open yours, browse the others, or start
            a new one.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          Create team
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="all">All teams</TabsTrigger>
            <TabsTrigger value="mine">My team</TabsTrigger>
            <TabsTrigger value="archive">Archive</TabsTrigger>
          </TabsList>
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search teams"
              className="w-full pl-9 sm:w-64"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        <TabsContent value="all">
          <TeamGrid
            teams={lists.all}
            loading={loadingAll}
            empty={
              query
                ? noMatch("the programme")
                : {
                    icon: Users,
                    title: "No teams yet",
                    description:
                      "Nobody has started a team. Be the first to create one.",
                    action: {
                      label: "Create team",
                      onClick: () => setCreateOpen(true),
                    },
                  }
            }
          />
        </TabsContent>

        <TabsContent value="mine">
          <TeamGrid
            teams={lists.mine}
            loading={loadingMine}
            empty={
              query
                ? noMatch("your teams")
                : {
                    icon: Users,
                    title: "You are not in a team yet",
                    description:
                      "Join a team from the list, or create your own.",
                    action: {
                      label: "Create team",
                      onClick: () => setCreateOpen(true),
                    },
                  }
            }
          />
        </TabsContent>

        <TabsContent value="archive">
          <TeamGrid
            teams={lists.archive}
            loading={loadingArchived}
            empty={
              query
                ? noMatch("the archive")
                : {
                    icon: PackageOpen,
                    title: "No archived teams",
                    description: "Teams from closed batches will show up here.",
                  }
            }
          />
        </TabsContent>
      </Tabs>

      <CreateTeamDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        alreadyInTeam={myTeams.length > 0}
        onTeamCreated={() =>
          queryClient.invalidateQueries({ queryKey: ["teamJourney"] })
        }
      />
    </div>
  );
}
