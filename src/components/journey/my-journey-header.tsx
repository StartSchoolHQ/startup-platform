import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface MyJourneyHeaderProps {
  name: string;
  avatarUrl?: string | null;
}

/** Page header for My Journey — mirrors the Team Journey detail header. */
export function MyJourneyHeader({ name, avatarUrl }: MyJourneyHeaderProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0 rounded-lg">
          {avatarUrl ? (
            <AvatarImage
              src={avatarUrl}
              alt={name}
              className="rounded-lg object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-muted rounded-lg text-lg font-bold">
            {initial}
          </AvatarFallback>
        </Avatar>
        <h1 className="text-3xl font-bold">{name}</h1>
        <Badge variant="secondary">My Journey</Badge>
      </div>
      <p className="text-muted-foreground text-lg">Solo preparation phase</p>
    </div>
  );
}
