"use client";

import { useApp } from "@/contexts/app-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Users, DollarSign, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { getUserTransactions } from "@/lib/database";

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

const getTransactionColor = (type: string) => {
  switch (type) {
    case "task":
      return "text-green-500";
    case "revenue":
      return "text-blue-500";
    case "validation":
      return "text-purple-500";
    case "team_cost":
      return "text-orange-500";
    default:
      return "text-gray-500";
  }
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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTransactions = async () => {
      if (!user?.id) return;

      try {
        const data = await getUserTransactions(user.id, 50); // Get last 50 transactions
        setTransactions(data as unknown as Transaction[]);
      } catch (error) {
        console.error("Error loading transactions:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <p className="text-muted-foreground">
            Loading your transaction history...
          </p>
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Trophy className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.total_xp || 0}</div>
            <p className="text-xs text-muted-foreground">
              Experience points earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <Star className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user?.total_points || 0}</div>
            <p className="text-xs text-muted-foreground">
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Start completing tasks or joining teams to see your transaction
                history
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.type);
                const iconColor = getTransactionColor(transaction.type);

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-muted">
                        <Icon className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {formatTransactionDescription(transaction)}
                        </p>
                        <p className="text-sm text-muted-foreground">
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
                        >
                          {transaction.points_change > 0 ? "+" : ""}
                          {transaction.points_change} Credits
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {transaction.type.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
