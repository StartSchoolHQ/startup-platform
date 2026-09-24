"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ActivityKind, ActivityRow } from "@/lib/activity/format";

export interface ActivityFilters {
  userId: string | null;
  /** null = every kind. */
  kinds: ActivityKind[] | null;
  /** ISO dates (yyyy-mm-dd) from the date inputs, or null. */
  from: string | null;
  to: string | null;
}

export const ACTIVITY_PAGE = 50;

interface Page {
  rows: ActivityRow[];
  nextOffset: number | null;
}

/** Paged feed from `get_admin_activity_v1`; asks for one extra row to learn whether more exist. */
export function useAdminActivity(filters: ActivityFilters) {
  return useInfiniteQuery<Page>({
    queryKey: ["admin", "activity", filters],
    initialPageParam: 0,
    staleTime: 30 * 1000,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam as number;
      const { data, error } = await createClient().rpc(
        "get_admin_activity_v1",
        {
          ...(filters.userId ? { p_user_id: filters.userId } : {}),
          ...(filters.kinds?.length ? { p_kinds: filters.kinds } : {}),
          ...(filters.from ? { p_from: `${filters.from}T00:00:00Z` } : {}),
          ...(filters.to ? { p_to: `${filters.to}T23:59:59Z` } : {}),
          p_limit: ACTIVITY_PAGE + 1,
          p_offset: offset,
        }
      );
      if (error) throw new Error(error.message);
      const all = (data ?? []) as unknown as ActivityRow[];
      const hasMore = all.length > ACTIVITY_PAGE;
      return {
        rows: hasMore ? all.slice(0, ACTIVITY_PAGE) : all,
        nextOffset: hasMore ? offset + ACTIVITY_PAGE : null,
      };
    },
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
}

export interface FilterUser {
  id: string;
  name: string | null;
  email: string | null;
}

/** Active, non-test accounts for the student picker. */
export function useUsersForFilter() {
  return useQuery({
    queryKey: ["admin", "users-for-filter"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<FilterUser[]> => {
      const { data, error } = await createClient().rpc("get_users_for_filter");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}
