"use client";

import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getPageContext } from "@/lib/assistant/page-context";
import type { ChatMessage } from "@/types/assistant";
import {
  fetchThreadMessages,
  remainingKey,
  threadKey,
  threadsKey,
  useStartieMessages,
  useStartieRemaining,
  useStartieThreads,
} from "./use-startie-threads";

interface Options {
  userId: string;
  isAdmin: boolean;
  dailyLimit: number;
  pathname: string;
  /** Fires when a reply has fully streamed in (widget unread dot). */
  onReplyDone?: () => void;
}

/**
 * One thread at a time: persisted turns from React Query plus optimistic
 * bubbles while a reply streams. The daily limit is enforced server-side;
 * `remaining` here is display only.
 */
export function useStartieChat(opts: Options) {
  const queryClient = useQueryClient();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  const threads = useStartieThreads(opts.userId);
  const persisted = useStartieMessages(threadId);
  const remainingQuery = useStartieRemaining(opts.userId, opts.dailyLimit);
  const [remainingOverride, setRemainingOverride] = useState<number | null>(
    null
  );
  const remaining = opts.isAdmin
    ? null
    : (remainingOverride ?? remainingQuery.data ?? opts.dailyLimit);

  const send = useMutation({
    retry: 0,
    mutationFn: async (content: string) => {
      setBanner(null);
      const stamp = Date.now();
      const replyId = `pending-reply-${stamp}`;
      setPending([
        { id: `pending-user-${stamp}`, role: "user", content },
        { id: replyId, role: "assistant", content: "", pending: true },
      ]);

      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: threadId ?? undefined,
          content,
          pageContext: getPageContext(opts.pathname),
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setPending([]);
        if (res.status === 429) setRemainingOverride(0);
        if (res.status === 429 || res.status === 503) {
          setBanner(body.error ?? "Startie is unavailable right now.");
          return;
        }
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const newThreadId = res.headers.get("X-Startie-Thread-Id") ?? threadId;
      const remainingHeader = res.headers.get("X-Startie-Remaining");
      if (remainingHeader) setRemainingOverride(Number(remainingHeader));

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        const snapshot = text;
        setPending((prev) =>
          prev.map((m) => (m.id === replyId ? { ...m, content: snapshot } : m))
        );
      }

      if (newThreadId) {
        // Fill the cache for this thread BEFORE switching to it, so the
        // persisted turns are already there when the optimistic bubbles go
        // and the disclosure line never flashes between the two.
        await queryClient.fetchQuery({
          queryKey: threadKey(newThreadId),
          queryFn: () => fetchThreadMessages(newThreadId),
          staleTime: 0,
        });
        setThreadId(newThreadId);
      }
      setPending([]);
      opts.onReplyDone?.();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: threadsKey(opts.userId) }),
        queryClient.invalidateQueries({
          queryKey: remainingKey(opts.userId),
        }),
      ]);
      setRemainingOverride(null);
    },
    onError: (error: Error) => {
      setPending([]);
      toast.error(`Startie couldn't answer — ${error.message}`);
    },
  });

  const flag = useMutation({
    retry: 0,
    mutationFn: async (messageId: string) => {
      const { error } = await createClient().rpc("assistant_flag_message_v1", {
        p_message_id: messageId,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Thanks, an admin will look at that reply."),
    onError: (error: Error) =>
      toast.error(`Couldn't flag that reply — ${error.message}`),
  });

  const selectThread = useCallback((id: string) => {
    setThreadId(id);
    setPending([]);
    setBanner(null);
  }, []);

  const newThread = useCallback(() => {
    setThreadId(null);
    setPending([]);
    setBanner(null);
  }, []);

  return {
    threadId,
    threads: threads.data ?? [],
    messages: [...(persisted.data ?? []), ...pending],
    loadingMessages: persisted.isLoading && !!threadId,
    remaining,
    banner,
    streaming: send.isPending,
    send: (content: string) => send.mutate(content),
    flag: (messageId: string) => flag.mutate(messageId),
    selectThread,
    newThread,
  };
}
