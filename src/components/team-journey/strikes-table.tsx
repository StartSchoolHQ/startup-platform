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
          class: "bg-green-100 text-green-800",
        };
      case "waiting-explanation":
        return {
          text: "Waiting on Explanation",
          class: "bg-red-100 text-red-800",
        };
    }
  };

  const getActionConfig = (action: Strike["action"]) => {
    switch (action) {
      case "done":
        return {
          text: "Done",
          class: "bg-green-600 text-white hover:bg-green-700",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "explain":
        return {
          text: "Explain",
          class:
            "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50",
          icon: <Clock className="h-3 w-3 mr-1" />,
        };
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-4 px-4 font-medium text-gray-600">
                Strike
              </th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">
                Status
              </th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">
                XP
              </th>
              <th className="text-left py-4 px-4 font-medium text-gray-600">
                Points
              </th>
              <th className="text-right py-4 px-4 font-medium text-gray-600">
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
                    index < strikes.length - 1 ? "border-b border-gray-100" : ""
                  } hover:bg-gray-50`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
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
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">
                        -{strike.xpPenalty}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-blue-500" />
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
