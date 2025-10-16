import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CheckCircle, X, Zap, CreditCard } from "lucide-react";

interface WeeklyReport {
  id: string;
  week: string;
  dateRange: string;
  weeklyFill: {
    avatars: string[];
    names: string[];
  };
  clients: number;
  meetings: number;
  xp: number;
  points: number;
  status: "complete" | "done" | "missed";
}

interface WeeklyReportsTableProps {
  reports: WeeklyReport[];
}

export function WeeklyReportsTable({ reports }: WeeklyReportsTableProps) {
  const getStatusConfig = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "complete":
        return {
          buttonText: "Complete",
          buttonClass:
            "bg-background border border-input text-foreground hover:bg-accent hover:text-accent-foreground",
          icon: null,
        };
      case "done":
        return {
          buttonText: "Done",
          buttonClass: "bg-primary text-primary-foreground hover:bg-primary/90",
          icon: <CheckCircle className="h-3 w-3 mr-1" />,
        };
      case "missed":
        return {
          buttonText: "Missed",
          buttonClass:
            "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          icon: <X className="h-3 w-3 mr-1" />,
        };
    }
  };

  const getRowBackgroundColor = (status: WeeklyReport["status"]) => {
    switch (status) {
      case "done":
        return "bg-primary/5 border-l-4 border-l-primary";
      case "missed":
        return "bg-destructive/5 border-l-4 border-l-destructive";
      default:
        return "";
    }
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Week
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Weekly Fill
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Clients
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Meetings
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
            {reports.map((report, index) => {
              const statusConfig = getStatusConfig(report.status);
              return (
                <tr
                  key={report.id}
                  className={`${
                    index < reports.length - 1
                      ? "border-b border-border/50"
                      : ""
                  } hover:bg-muted/20 transition-colors ${getRowBackgroundColor(
                    report.status
                  )}`}
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm text-foreground">
                          {report.week}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {report.dateRange}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {report.weeklyFill.avatars.map((avatar, idx) => (
                        <Avatar key={idx} className="w-8 h-8">
                          <AvatarImage
                            src={avatar}
                            alt={report.weeklyFill.names[idx]}
                          />
                          <AvatarFallback className="bg-gradient-to-r from-purple-400 to-pink-400 text-primary-foreground font-bold text-xs">
                            DP
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">
                        {report.clients}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {report.meetings}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{report.xp}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {report.points}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        className={`text-xs ${statusConfig.buttonClass}`}
                      >
                        {statusConfig.icon}
                        {statusConfig.buttonText}
                      </Button>
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
