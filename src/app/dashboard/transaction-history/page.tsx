"use client";

import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Star,
  Users,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useQuery } from "@tanstack/react-query";
import { getUserTransactions } from "@/lib/database";
import { motion } from "framer-motion";
import Link from "next/link";

interface Transaction {
  id: string;
  type: string;
  xp_change: number;
  points_change: number;
  description: string | null;
  created_at: string | null;
  team?: { name: string } | null;
  achievement?: { name: string } | null;
  revenue_stream?: { product_name: string } | null;
}

const getTransactionIcon = (type: string) => {
  switch (type) {
    case "task":
      return CheckCircle;
    case "revenue":
      return DollarSign;
    case "validation":
      return Trophy;
    case "team_cost":
      return Users;
    default:
      return Star;
  }
};

const getTransactionColor = () => {
  // Return consistent black theme for all transaction types
  return "text-black dark:text-white";
};

const formatTransactionDescription = (transaction: Transaction) => {
  if (transaction.description) {
    return transaction.description;
  }

  switch (transaction.type) {
    case "task":
      return "Task completed";
    case "revenue":
      return transaction.revenue_stream?.product_name
        ? `Revenue from: ${transaction.revenue_stream.product_name}`
        : "Revenue earned";
    case "validation":
      return "Peer validation reward";
    case "team_cost":
      return transaction.team?.name
        ? `Team cost for: ${transaction.team.name}`
        : "Team maintenance cost";
    default:
      return "Transaction";
  }
};

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

  if (isPending) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            Loading your transaction history...
          </p>
        </div>
        <TableSkeleton rows={10} columns={6} showHeader={false} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            Your complete XP and Credits transaction history
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertTriangle className="text-muted-foreground h-10 w-10" />
            <div className="text-center">
              <p className="font-medium">Failed to load transactions</p>
              <p className="text-muted-foreground mt-1 text-sm">
                This is usually temporary. Please try again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Transaction History</h1>
        <p className="text-muted-foreground">
          Your complete XP and Credits transaction history
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Trophy className="h-4 w-4 text-black dark:text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.total_xp || 0}</div>
            <p className="text-muted-foreground text-xs">
              Experience points earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Star className="h-4 w-4 text-black dark:text-white" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.total_points || 0}</div>
            <p className="text-muted-foreground text-xs">
              Available startup capital
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Rocket className="text-muted-foreground h-10 w-10" />
              <div className="text-center">
                <p className="font-medium">No transactions yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Complete tasks or join teams to start earning XP and Credits.
                </p>
              </div>
              <Button variant="outline" asChild className="gap-2">
                <Link href="/dashboard/my-journey">
                  <CheckCircle className="h-4 w-4" />
                  View My Tasks
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => {
                const Icon = getTransactionIcon(transaction.type);
                const iconColor = getTransactionColor();

                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      delay: index * 0.03,
                    }}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-muted rounded-full p-2">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatTransactionDescription(transaction)}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {new Date(
                            transaction.created_at || ""
                          ).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {transaction.xp_change !== 0 && (
                        <Badge
                          variant={
                            transaction.xp_change > 0
                              ? "default"
                              : "destructive"
                          }
                          className={
                            transaction.xp_change > 0
                              ? "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                              : ""
                          }
                        >
                          {transaction.xp_change > 0 ? "+" : ""}
                          {transaction.xp_change} XP
                        </Badge>
                      )}
                      {transaction.points_change !== 0 && (
                        <Badge
                          variant={
                            transaction.points_change > 0
                              ? "default"
                              : "destructive"
                          }
                          className={
                            transaction.points_change > 0
                              ? "bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                              : ""
                          }
                        >
                          {transaction.points_change > 0 ? "+" : ""}
                          {transaction.points_change} Credits
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {transaction.type.replace("_", " ")}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
