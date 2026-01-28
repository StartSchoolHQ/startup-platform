"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { toast } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute - data is fresh for this duration
            gcTime: 5 * 60 * 1000, // 5 minutes - cache garbage collection time
            retry: 1, // Retry failed requests once
            refetchOnWindowFocus: true, // Refetch when user returns to tab
            refetchOnReconnect: true, // Refetch when internet reconnects
            refetchOnMount: true, // Refetch when component mounts
          },
          mutations: {
            retry: 0, // Don't retry mutations to avoid duplicate actions
            onError: (error: Error) => {
              // Global safety net for any mutation errors without custom handlers
              // Component-level onError handlers will override this
              toast.error("Something went wrong", {
                description: error.message || "Please try again later",
              });
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
