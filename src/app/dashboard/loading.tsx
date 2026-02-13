import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <PageSkeleton showStats showTabs />
    </div>
  );
}
