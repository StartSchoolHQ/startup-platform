"use client";

import { useApp } from "@/contexts/app-context";
import { redirect, useRouter } from "next/navigation";
import {
  Users,
  ListChecks,
  UsersRound,
  FileText,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminSkeleton } from "@/components/ui/admin-skeleton";
import { AdminOverview } from "@/components/admin/admin-overview";

export default function AdminPage() {
  const { user, loading } = useApp();
  const router = useRouter();

  // Redirect if not admin
  if (!loading && (!user || user.primary_role !== "admin")) {
    redirect("/dashboard");
  }

  // Show loading state
  if (loading) {
    return <AdminSkeleton />;
  }

  const adminSections = [
    {
      title: "Task Management",
      description: "Manage team and individual task templates",
      icon: ListChecks,
      href: "/dashboard/admin/tasks",
      color: "text-blue-600",
    },
    {
      title: "User Management",
      description: "View users, manage invitations and roles",
      icon: Users,
      href: "/dashboard/admin/users",
      color: "text-green-600",
    },
    {
      title: "Team Management",
      description: "Manage teams and team strikes",
      icon: UsersRound,
      href: "/dashboard/admin/teams",
      color: "text-purple-600",
    },
    {
      title: "Peer Reviews",
      description: "View peer review submissions and decisions",
      icon: FileSearch,
      href: "/dashboard/admin/peer-reviews",
      color: "text-pink-600",
    },
    {
      title: "Audit Logs",
      description: "View database change history and audit trail",
      icon: FileText,
      href: "/dashboard/admin/audit-logs",
      color: "text-orange-600",
    },
  ];

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Admin Panel</h2>
      </div>

      {/* Platform Overview */}
      <AdminOverview />

      {/* Quick Navigation */}
      <div className="pt-6">
        <h3 className="mb-4 text-xl font-semibold">Management Sections</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {adminSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.href}
                className="cursor-pointer transition-shadow hover:shadow-lg"
                onClick={() => router.push(section.href)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className={`h-8 w-8 ${section.color}`} />
                    <ArrowRight className="text-muted-foreground h-4 w-4" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(section.href);
                    }}
                  >
                    Open Section
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
