import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { DifficultyBadge } from "@/components/ui/difficulty-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Medal,
  CheckCircle,
  Zap,
  CreditCard,
  Play,
  Loader2,
} from "lucide-react";
import { TaskTableItem } from "@/types/team-journey";
import { useRouter } from "next/navigation";

interface TasksTableProps {
  tasks: TaskTableItem[];
  isTeamMember?: boolean;
  teamMembers?: Array<{ id: string; name: string; avatar: string }>;
  currentUserId?: string;
  onAssignTask?: (taskId: string, userId: string) => void;
  onStartTask?: (taskId: string) => void;
}

export function TasksTable({
  tasks,
  isTeamMember = false,
  teamMembers = [],
  currentUserId,
  onAssignTask,
  onStartTask,
}: TasksTableProps) {
  const router = useRouter();

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Task
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Responsible
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Difficulty
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                XP
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Points
              </th>
              <th className="text-left py-4 px-4 font-medium text-muted-foreground">
                Status
              </th>
              <th className="text-right py-4 px-4 font-medium text-muted-foreground">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr
                key={task.id}
                className={`${
                  index < tasks.length - 1 ? "border-b border-border" : ""
                } hover:bg-muted/20 transition-colors`}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      <Medal className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{task.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {task.description}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  {task.responsible ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage
                          src={task.responsible.avatar}
                          alt={task.responsible.name}
                        />
                        <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                          {task.responsible.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-xs font-medium">
                          {task.responsible.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            try {
                              const date = new Date(task.responsible.date);
                              const day = String(date.getDate()).padStart(
                                2,
                                "0"
                              );
                              const month = String(
                                date.getMonth() + 1
                              ).padStart(2, "0");
                              const year = String(date.getFullYear()).slice(-2);
                              const hours = String(date.getHours()).padStart(
                                2,
                                "0"
                              );
                              const minutes = String(
                                date.getMinutes()
                              ).padStart(2, "0");
                              return `${day}-${month}-${year} ${hours}:${minutes}`;
                            } catch {
                              return task.responsible.date;
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  ) : isTeamMember && task.isAvailable ? (
                    <Select
                      onValueChange={(userId) => {
                        if (onAssignTask) {
                          onAssignTask(task.id, userId);
                        }
                      }}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Choose Member" />
                      </SelectTrigger>
                      <SelectContent>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={member.avatar} />
                                <AvatarFallback className="text-xs">
                                  {member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")}
                                </AvatarFallback>
                              </Avatar>
                              <span>{member.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {task.isAvailable === false ? "Locked" : "Choose Member"}
                    </span>
                  )}
                </td>
                <td className="py-4 px-4">
                  <DifficultyBadge
                    level={
                      task.difficulty === "Easy"
                        ? 1
                        : task.difficulty === "Medium"
                        ? 2
                        : 3
                    }
                  />
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{task.xp}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{task.points}</span>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <StatusBadge
                    status={
                      task.status === "Finished"
                        ? "approved"
                        : task.status === "Not Accepted"
                        ? "rejected"
                        : task.status === "Peer Review"
                        ? "pending_review"
                        : task.status === "In Progress"
                        ? "in_progress"
                        : "not_started"
                    }
                    variant="journey"
                  />
                </td>
                <td className="py-4 px-4">
                  <div className="flex justify-end gap-2">
                    {task.status === "Finished" ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90 text-xs"
                          disabled
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done
                        </Button>
                        {task.id && task.id.toString().startsWith("temp-") ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-2"
                            disabled
                          >
                            <Loader2 className="h-3 w-3 animate-spin" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs px-3 py-2 border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                            onClick={() =>
                              router.push(
                                `/dashboard/team-journey/task/${task.id}`
                              )
                            }
                          >
                            View Info
                          </Button>
                        )}
                      </>
                    ) : (
                      <>
                        {task.hasTips && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs px-2 text-[#ff78c8] hover:bg-[#ff78c8]/10"
                          >
                            Tips
                          </Button>
                        )}
                        {/* Show Start button for unassigned available tasks */}
                        {isTeamMember &&
                        task.isAvailable &&
                        !task.responsible &&
                        currentUserId &&
                        onStartTask ? (
                          <Button
                            variant="default"
                            size="sm"
                            className="text-xs px-3 py-2 bg-[#ff78c8] text-white hover:bg-[#ff78c8]/90"
                            onClick={() => onStartTask(task.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start
                          </Button>
                        ) : task.responsible ? (
                          // Task is assigned - everyone sees View Info button
                          task.id && task.id.toString().startsWith("temp-") ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-3 py-2"
                              disabled
                            >
                              <Loader2 className="h-3 w-3 animate-spin" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs px-3 py-2 border-[#0000ff] text-[#0000ff] hover:bg-[#0000ff] hover:text-white"
                              onClick={() =>
                                router.push(
                                  `/dashboard/team-journey/task/${task.id}`
                                )
                              }
                            >
                              View Info
                            </Button>
                          )
                        ) : null}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
