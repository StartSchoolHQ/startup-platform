"use client";

import { useApp } from "@/contexts/app-context";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { WeeklyReportBanner } from "@/components/dashboard/weekly-report-banner";
import { IndividualWeeklyReportBanner } from "@/components/dashboard/individual-weekly-report-banner";

const pageNames: Record<string, string> = {
  admin: "Admin",
  leaderboard: "Leaderboard",
  "my-journey": "My Journey",
  "peer-review": "Peer Review",
  "team-journey": "Team Journey",
  "transaction-history": "Transaction History",
  "how-it-works": "How it works",
  changelog: "What's new",
  support: "Support",
  account: "Account",
  invitations: "Invitations",
};

/** What a section's detail page is called when the URL only has an id. */
const detailNames: Record<string, string> = {
  "team-journey": "Team",
  "my-journey": "Task",
};

const isId = (segment: string) =>
  /^[0-9a-f-]{20,}$/i.test(segment) || segment.startsWith("temp-");

const titleCase = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Breadcrumb trail from the pathname. One level deep (`/dashboard/admin`)
 * the section is the current page. Deeper, the section becomes a link and
 * the last named segment is the current page (`Team Journey > Task`,
 * `Admin > Users`) — Sasha's SMP-03/SMP-10: the trail was never clickable.
 */
function breadcrumbs(pathname: string) {
  const segments = pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean);
  const section = segments[0];
  if (!section) return { section: null, current: null };
  const sectionName = pageNames[section] ?? titleCase(section);
  if (segments.length === 1) return { section: null, current: sectionName };
  const named = segments.slice(1).filter((s) => !isId(s));
  const current = named.length
    ? titleCase(named[named.length - 1])
    : (detailNames[section] ?? "Details");
  return {
    section: { name: sectionName, href: `/dashboard/${section}` },
    current,
  };
}

function PageLoader() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-80 rounded-md" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useApp();
  const pathname = usePathname();
  const trail = breadcrumbs(pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
                </BreadcrumbItem>
                {trail.section && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href={trail.section.href}>
                        {trail.section.name}
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                {trail.current && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbPage>{trail.current}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        {loading ? (
          <PageLoader />
        ) : (
          <>
            <WeeklyReportBanner />
            <IndividualWeeklyReportBanner />
            {/* Bottom padding clears the floating Startie button (56px at
                bottom-4) so it never covers a page's last row of buttons. */}
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0 pb-24">
              {children}
            </div>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
