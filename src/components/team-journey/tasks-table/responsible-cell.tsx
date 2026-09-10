import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskTableItem } from "@/types/team-journey";

export interface TeamMemberOption {
  id: string;
  name: string;
  avatar: string;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatAssignedAt(raw: string) {
  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${String(
      date.getFullYear()
    ).slice(-2)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  } catch {
    return raw;
  }
}

interface ResponsibleCellProps {
  task: TaskTableItem;
  isTeamMember: boolean;
  teamMembers: TeamMemberOption[];
  onAssignTask?: (taskId: string, userId: string) => void;
}

/** Team Journey only: who owns the task, or the member picker to assign it. */
export function TaskResponsibleCell({
  task,
  isTeamMember,
  teamMembers,
  onAssignTask,
}: ResponsibleCellProps) {
  if (task.responsible) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6">
          <AvatarImage
            src={task.responsible.avatar}
            alt={task.responsible.name}
          />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
            {initials(task.responsible.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-xs font-medium">
            {task.responsible.name}
          </div>
          <div className="text-muted-foreground text-[11px]">
            {formatAssignedAt(task.responsible.date)}
          </div>
        </div>
      </div>
    );
  }

  if (isTeamMember && task.isAvailable) {
    return (
      <Select onValueChange={(userId) => onAssignTask?.(task.id, userId)}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Choose member" />
        </SelectTrigger>
        <SelectContent>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback className="text-[9px]">
                    {initials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span>{member.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const text =
    task.isAvailable === false
      ? "Locked"
      : !isTeamMember
        ? "Unassigned"
        : "Choose member";

  return <span className="text-muted-foreground text-xs">{text}</span>;
}
