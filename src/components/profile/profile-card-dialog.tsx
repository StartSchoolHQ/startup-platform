"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileCard } from "@/hooks/use-profile-card";
import { ProfileCardHeader } from "@/components/profile/profile-card-header";
import {
  ProfileCardBody,
  ProfileCardFooter,
  ProfileCardSkeleton,
} from "@/components/profile/profile-card-content";

interface Props {
  /** User to show; null keeps the dialog closed. */
  userId: string | null;
  onClose: () => void;
}

/**
 * Read-only founder card opened from leaderboard rows. Reusable anywhere a
 * user id is at hand (team pages, peer review) — just control `userId`.
 */
export function ProfileCardDialog({ userId, onClose }: Props) {
  const { data: card, isLoading, isError } = useProfileCard(userId);

  return (
    <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden overflow-y-auto p-0 sm:max-w-lg">
        {isLoading ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Loading profile</DialogTitle>
              <DialogDescription>
                Fetching this student’s card.
              </DialogDescription>
            </DialogHeader>
            <ProfileCardSkeleton />
          </>
        ) : card ? (
          <>
            <ProfileCardHeader card={card} />
            <div className="mt-2">
              <ProfileCardBody card={card} />
            </div>
            <ProfileCardFooter card={card} />
          </>
        ) : (
          <DialogHeader className="px-6 pt-6 pb-8 text-left">
            <DialogTitle>Profile not available</DialogTitle>
            <DialogDescription>
              {isError
                ? "The card didn’t load. Close this and click the name again."
                : "This student is no longer active, so their card isn’t shown."}
            </DialogDescription>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
