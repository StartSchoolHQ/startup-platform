import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Zap,
  CreditCard,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Strike {
  id: string;
  title: string;
  datetime: string;
  status: "explained" | "waiting-explanation";
  xpPenalty: number;
  pointsPenalty: number;
  action: "done" | "explain";
}

interface StrikesTableProps {
  strikes: Strike[];
  isTeamMember?: boolean;
}

export function StrikesTable({
  strikes,
  isTeamMember = false,
}: StrikesTableProps) {
  const getStatusConfig = (status: Strike["status"]) => {
    switch (status) {
      case "explained":
        return {
          text: "Explained",
          class: "bg-primary/10 text-primary",
        };
      case "waiting-explanation":
        return {
          text: "Waiting on Explanation",
          class: "bg-destructive/10 text-destructive",
        };
    }
  };

  const getActionConfig = (action: Strike["action"]) => {
    switch (action) {
      case "done":
        return {
          text: "Done",
          class: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "explain":
        return {
          text: "Explain",
          class:
            "bg-background border border-input text-foreground hover:bg-muted/20",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Strike
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                XP
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Points
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {strikes.map((strike, index) => {
              const statusConfig = getStatusConfig(strike.status);
              const actionConfig = getActionConfig(strike.action);

              return (
                <tr
                  key={strike.id}
                  className={`${
                    index < strikes.length - 1 ? "border-b border-border" : ""
                  } hover:bg-muted/20 transition-colors`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {strike.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {strike.datetime}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge variant="secondary" className={statusConfig.class}>
                      {statusConfig.text}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        -{strike.xpPenalty}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        -{strike.pointsPenalty}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end">
                      {isTeamMember ? (
                        <Button
                          size="sm"
                          className={`text-xs ${actionConfig.class}`}
                        >
                          {actionConfig.icon}
                          {actionConfig.text}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground px-3 py-2">
                          View Only
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
