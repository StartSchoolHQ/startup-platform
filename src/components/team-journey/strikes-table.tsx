import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

interface Strike {
  id: string;
  title: string;
  datetime: string;
  status: "explained" | "waiting-explanation";
  action: "done" | "explain";
  userName?: string;
  description?: string;
}

interface StrikesTableProps {
  strikes: Strike[];
  isTeamMember?: boolean;
  onExplainClick?: (strike: Strike) => void;
}

export function StrikesTable({
  strikes,
  isTeamMember = false,
  onExplainClick,
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
      default:
        // Defensive fallback for undefined/unknown status
        return {
          text: "Unknown",
          class: "bg-muted/50 text-muted-foreground",
        };
    }
  };

  const getActionConfig = (action: Strike["action"]) => {
    switch (action) {
      case "done":
        return {
          text: "Done",
          class: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <CheckCircle className="mr-1 h-3 w-3" />,
        };
      case "explain":
        return {
          text: "Explain",
          class:
            "bg-background border border-input text-foreground hover:bg-muted/20",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
      default:
        // Defensive fallback for undefined/unknown actions
        return {
          text: "Pending",
          class: "bg-muted text-muted-foreground hover:bg-muted/80",
          icon: <Clock className="mr-1 h-3 w-3" />,
        };
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-border border-b">
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Strike
              </th>
              <th className="text-muted-foreground px-4 py-4 text-left font-medium">
                Status
              </th>
              <th className="text-muted-foreground px-4 py-4 text-right font-medium">
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
                    index < strikes.length - 1 ? "border-border border-b" : ""
                  } hover:bg-muted/20 transition-colors`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-8 w-8 items-center justify-center rounded-md">
                        <AlertTriangle className="text-destructive h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {strike.title}
                          {strike.userName && (
                            <span className="text-muted-foreground ml-2 font-normal">
                              • {strike.userName}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {strike.datetime}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant="secondary" className={statusConfig.class}>
                      {statusConfig.text}
                    </Badge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex justify-end">
                      {isTeamMember ? (
                        <Button
                          size="sm"
                          className={`text-xs ${actionConfig.class}`}
                          onClick={() =>
                            strike.action === "explain" &&
                            onExplainClick?.(strike)
                          }
                          disabled={strike.action === "done"}
                        >
                          {actionConfig.icon}
                          {actionConfig.text}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground px-3 py-2 text-xs">
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
