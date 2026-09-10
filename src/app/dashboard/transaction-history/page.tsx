"use client";

import { useApp } from "@/contexts/app-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCardComponent } from "@/components/dashboard/stats-card";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { TransactionRow } from "@/components/transactions/transaction-row";
import { useQuery } from "@tanstack/react-query";
import { getUserTransactions } from "@/lib/database";
import { economyLabels } from "@/lib/economy-labels";
import Link from "next/link";
import {
  AlertTriangle,
  CreditCard,
  History,
  RefreshCw,
  Zap,
} from "lucide-react";

const solo = economyLabels("my_journey");
const team = economyLabels("team");

function Header() {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Transactions
      </h1>
      <p className="text-muted-foreground text-sm">
        Every reward and cost across My Journey and Team Journey.
      </p>
    </div>
  );
}

export default function TransactionHistoryPage() {
  const { user } = useApp();

  const {
    data: transactions = [],
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: () => getUserTransactions(user!.id, 50),
    enabled: !!user?.id,
  });

  const balances = [
    {
      title: solo.xp,
      value: (user?.my_journey_xp ?? 0).toLocaleString(),
      subtitle: "Earned in the solo phase",
      icon: Zap,
      iconColor: "text-primary",
    },
    {
      title: solo.points,
      value: (user?.my_journey_credits ?? 0).toLocaleString(),
      subtitle: "Available to spend",
      icon: CreditCard,
      iconColor: "text-primary",
    },
    {
      title: team.xp,
      value: (user?.team_xp ?? 0).toLocaleString(),
      subtitle: "Earned with your team",
      icon: Zap,
      iconColor: "text-muted-foreground",
    },
    {
      title: team.points,
      value: (user?.team_points ?? 0).toLocaleString(),
      subtitle: "Startup capital available",
      icon: CreditCard,
      iconColor: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6">
      <Header />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {balances.map((card) => (
          <StatsCardComponent key={card.title} {...card} />
        ))}
      </div>

      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <SectionLabel
            icon={History}
            title="Recent activity"
            aside={
              transactions.length > 0
                ? `Last ${transactions.length}`
                : undefined
            }
          />
        </div>

        {isPending ? (
          <ul className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-4 w-20" />
              </li>
            ))}
          </ul>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <AlertTriangle className="text-muted-foreground h-8 w-8" />
            <p className="text-sm font-medium">
              Couldn&apos;t load transactions
            </p>
            <p className="text-muted-foreground text-sm">
              Usually temporary. Try again in a moment.
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-full">
              <History className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium">Nothing here yet</p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Finish a task and its reward will be the first line.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/my-journey">Go to My Journey</Link>
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {transactions.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
