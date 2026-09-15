import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { initials, memberSince } from "@/lib/profile-card";
import { cn } from "@/lib/utils";
import type { BackgroundLean } from "@/lib/validation-schemas";
import type { ProfileCard } from "@/types/profile-card";

const LEAN_SENTENCE: Record<BackgroundLean, string> = {
  tech: "Leans tech",
  business: "Leans business",
  both: "Tech and business, split",
};

/**
 * The card's signature: a two-segment track, tech on the left, business on
 * the right. The side this founder leans to is lit. This is the axis the
 * whole card exists for — team matching.
 */
function LeanTrack({ lean }: { lean: BackgroundLean }) {
  const tech = lean !== "business";
  const business = lean !== "tech";
  return (
    <div className="w-full max-w-[16rem]">
      <div className="grid h-1.5 grid-cols-2 gap-1">
        <span
          className={cn(
            "rounded-l-full transition-colors",
            tech ? "bg-primary" : "bg-foreground/10"
          )}
        />
        <span
          className={cn(
            "rounded-r-full transition-colors",
            business ? "bg-primary" : "bg-foreground/10"
          )}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-xs">
        <span
          className={cn(
            tech ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Tech
        </span>
        <span
          className={cn(
            business ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          Business
        </span>
      </div>
    </div>
  );
}

/** Tinted band, overlapping avatar, name, lean, and one quiet meta line. */
export function ProfileCardHeader({ card }: { card: ProfileCard }) {
  const lean = card.founder_card?.background_lean;
  const since = memberSince(card.member_since);
  const meta = [card.team?.name, since ? `Joined ${since}` : null].filter(
    Boolean
  ) as string[];

  return (
    <div>
      <div className="from-primary/20 via-primary/10 h-24 bg-gradient-to-br to-transparent" />
      <div className="px-6">
        <Avatar className="ring-background -mt-10 h-20 w-20 ring-4">
          <AvatarImage
            src={card.avatar_url ?? undefined}
            alt={card.name ?? "Student"}
          />
          <AvatarFallback className="text-xl font-semibold">
            {initials(card.name)}
          </AvatarFallback>
        </Avatar>

        <div className="mt-3 space-y-1">
          <DialogTitle className="text-2xl leading-tight font-semibold tracking-tight">
            {card.name ?? "Unnamed student"}
          </DialogTitle>
          <DialogDescription className="text-primary text-sm font-medium">
            {lean ? LEAN_SENTENCE[lean] : "No founder card yet"}
          </DialogDescription>
          {meta.length > 0 && (
            <p className="text-muted-foreground text-sm">{meta.join(", ")}</p>
          )}
        </div>

        {lean && (
          <div className="mt-4">
            <LeanTrack lean={lean} />
          </div>
        )}
      </div>
    </div>
  );
}
