"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, IdCard } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionLabel } from "@/components/dashboard/my-journey/section-label";
import { FounderCardForm } from "@/components/profile/founder-card-form";
import { profileCardKeys } from "@/hooks/use-profile-card";
import { createClient } from "@/lib/supabase/client";
import type { FounderCardInput } from "@/lib/validation-schemas";

const founderCardKey = (userId: string) => ["founder-card", userId] as const;

/**
 * The founder card as an editable section of the Account page. Same form as
 * profile setup step 2, pre-filled with the saved answers. Saving also drops
 * the cached leaderboard profile card so other students see the new text on
 * their next look.
 */
export function FounderCardSection({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: founderCardKey(userId),
    queryFn: async (): Promise<FounderCardInput | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("founder_profiles")
        .select(
          "background_lean, background_reason, bio_energizes, bio_skills, bio_gaps"
        )
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as FounderCardInput | null) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <div className="space-y-1">
          <SectionLabel icon={IdCard} title="Founder card" />
          <p className="text-muted-foreground text-sm">
            What other students see when they open your profile from the
            leaderboard. Keep it honest and current.
          </p>
        </div>

        {isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Couldn&apos;t load your founder card.
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              className="font-medium underline-offset-4 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {error && (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-red-500/5 px-3 py-2 text-sm text-red-700 dark:text-red-400"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
            <FounderCardForm
              appearance="account"
              initial={data}
              submitLabel="Save founder card"
              onError={setError}
              onDone={() => {
                setError(null);
                toast.success("Founder card saved");
                queryClient.invalidateQueries({
                  queryKey: founderCardKey(userId),
                });
                queryClient.invalidateQueries({
                  queryKey: profileCardKeys.card(userId),
                });
              }}
            />
          </>
        )}
      </div>
    </Card>
  );
}
