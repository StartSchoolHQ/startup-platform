"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startOfUtcDay } from "@/lib/assistant/limits";
import type { ChatMessage, ThreadSummary } from "@/types/assistant";

export const threadsKey = (userId: string) => ["assistant", "threads", userId];
export const threadKey = (threadId: string) => [
  "assistant",
  "thread",
  threadId,
];
export const remainingKey = (userId: string) => [
  "assistant",
  "remaining",
  userId,
];

/** The student's last 10 threads, newest first. Owner RLS does the scoping. */
export function useStartieThreads(userId: string | undefined) {
  return useQuery({
    queryKey: threadsKey(userId ?? ""),
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<ThreadSummary[]> => {
      const { data, error } = await createClient()
        .from("assistant_threads")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw new Error(error.message);
      return data.map((t) => ({
        id: t.id,
        title: t.title,
        updatedAt: t.updated_at,
      }));
    },
  });
}

/** Persisted user/assistant turns of one thread, oldest first. */
export async function fetchThreadMessages(
  threadId: string
): Promise<ChatMessage[]> {
  const { data, error } = await createClient()
    .from("assistant_messages")
    .select("id, role, content")
    .eq("thread_id", threadId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map((m) => ({
    id: m.id,
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
}

export function useStartieMessages(threadId: string | null) {
  return useQuery({
    queryKey: threadKey(threadId ?? ""),
    enabled: !!threadId,
    staleTime: 60 * 1000,
    queryFn: () => fetchThreadMessages(threadId!),
  });
}

/** Messages left today, from the same UTC-day window the RPC enforces. */
export function useStartieRemaining(
  userId: string | undefined,
  dailyLimit: number
) {
  return useQuery({
    queryKey: remainingKey(userId ?? ""),
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<number> => {
      const { count, error } = await createClient()
        .from("assistant_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId!)
        .eq("role", "user")
        .gte("created_at", startOfUtcDay().toISOString());
      if (error) throw new Error(error.message);
      return Math.max(0, dailyLimit - (count ?? 0));
    },
  });
}
