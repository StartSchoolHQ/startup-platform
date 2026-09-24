/**
 * The admin sidebar, grouped by what an admin is doing rather than by table.
 * Section labels render above the first item of each new section
 * (see `nav-main.tsx`). Order here is the order on screen.
 */
export interface AdminNavItem {
  section: string;
  title: string;
  url: string;
}

export function adminNavItems(teamJourneyOn: boolean): AdminNavItem[] {
  const teams = teamJourneyOn ? "Teams" : "Teams · paused";
  return [
    {
      section: "Insights",
      title: "Analytics",
      url: "/dashboard/admin/analytics",
    },
    {
      section: "Insights",
      title: "Activity Log",
      url: "/dashboard/admin/audit-logs",
    },
    { section: "People", title: "Users", url: "/dashboard/admin/users" },
    {
      section: "People",
      title: "Agreements",
      url: "/dashboard/admin/agreements",
    },
    { section: "People", title: "Diplomas", url: "/dashboard/admin/diplomas" },
    { section: "Curriculum", title: "Tasks", url: "/dashboard/admin/tasks" },
    {
      section: "Curriculum",
      title: "Peer Reviews",
      url: "/dashboard/admin/peer-reviews",
    },
    { section: teams, title: "Teams", url: "/dashboard/admin/teams" },
    {
      section: teams,
      title: "Weekly Reports",
      url: "/dashboard/admin/weekly-reports",
    },
    { section: "AI", title: "AI Reviews", url: "/dashboard/admin/ai-reviews" },
    { section: "AI", title: "Startie", url: "/dashboard/admin/startie" },
    { section: "Support", title: "Inbox", url: "/dashboard/admin/inbox" },
    { section: "System", title: "Settings", url: "/dashboard/admin/settings" },
  ];
}
