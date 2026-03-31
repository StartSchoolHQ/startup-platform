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

const pageNames: Record<string, string> = {
  admin: "Admin",
  leaderboard: "Leaderboard",
  "my-journey": "My Journey",
  "peer-review": "Peer Review",
  "team-journey": "All Teams",
  "transaction-history": "Transaction History",
  support: "Support",
  account: "Account",
  invitations: "Invitations",
};

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

  // Derive current page name from pathname
  const segments = pathname.replace(/^\/dashboard\/?/, "").split("/");
  const currentPageSlug = segments[0] || "";
  const currentPageName = currentPageSlug
    ? (pageNames[currentPageSlug] ??
      currentPageSlug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()))
    : "";

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
                {currentPageName && (
                  <>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbPage>{currentPageName}</BreadcrumbPage>
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
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {children}
            </div>
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
