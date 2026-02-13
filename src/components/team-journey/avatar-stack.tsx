import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  avatar: string;
}

interface AvatarStackProps {
  users: User[];
  maxVisible?: number;
  size?: "sm" | "md" | "lg";
}

export function AvatarStack({
  users,
  maxVisible = 4,
  size = "md",
}: AvatarStackProps) {
  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const offsetClasses = {
    sm: "-ml-2",
    md: "-ml-3",
    lg: "-ml-4",
  };

  return (
    <div className="flex items-center">
      {visibleUsers.map((user, index) => (
        <Avatar
          key={user.id}
          className={` ${sizeClasses[size]} ${index > 0 ? offsetClasses[size] : ""} border-background relative border-2 z-${10 - index} `}
        >
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ))}

      {remainingCount > 0 && (
        <Avatar
          className={` ${sizeClasses[size]} ${offsetClasses[size]} border-background bg-muted relative z-0 border-2`}
        >
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-semibold">
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
