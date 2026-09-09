"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AI_REVIEW_DEFAULTS,
  parseAiReviewSettings,
} from "@/lib/ai-review/settings";
import { AiReviewsSummary } from "./ai-reviews-summary";
import { AiReviewsFilters } from "./ai-reviews-filters";
import { AiReviewsRow } from "./ai-reviews-row";
import { AiReviewDetailDialog } from "./ai-review-detail-dialog";
import type {
  AiReviewAdminResponse,
  AiReviewAdminRow,
  AiReviewAdminSummary,
} from "@/types/ai-review-admin";

export function AiReviewsTable() {
  const [reviews, setReviews] = useState<AiReviewAdminRow[]>([]);
  const [summary, setSummary] = useState<AiReviewAdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rejectReasonFilter, setRejectReasonFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedReview, setSelectedReview] = useState<AiReviewAdminRow | null>(
    null
  );
  const limit = 25;
  const abortRef = useRef<AbortController | null>(null);
  const fetchVersion = useRef(0);

  // Same query key shape as the Task 16 settings hook — reads share the
  // TanStack Query cache once that hook is mounted elsewhere on the page.
  const { data: settings } = useQuery({
    queryKey: ["platform-settings", "ai_review"],
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("platform_settings")
        .select("value")
        .eq("key", "ai_review")
        .single();
      if (error) throw new Error(error.message);
      return parseAiReviewSettings(data.value);
    },
    staleTime: 5 * 60 * 1000,
  });
  const attemptFlagThreshold =
    settings?.attemptFlagThreshold ?? AI_REVIEW_DEFAULTS.attemptFlagThreshold;

  const fetchReviews = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const version = ++fetchVersion.current;

    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      search,
      status: statusFilter,
      reject_reason: rejectReasonFilter,
    });

    fetch(`/api/admin/ai-reviews?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: AiReviewAdminResponse) => {
        if (version === fetchVersion.current) {
          setReviews(data.data || []);
          setTotal(data.total || 0);
          setSummary(data.summary ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (version === fetchVersion.current) setLoading(false);
      });
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter, rejectReasonFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <AiReviewsSummary summary={summary} />

      <AiReviewsFilters
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(v) => {
          setStatusFilter(v);
          setPage(1);
        }}
        rejectReasonFilter={rejectReasonFilter}
        onRejectReasonChange={(v) => {
          setRejectReasonFilter(v);
          setPage(1);
        }}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Attempt</TableHead>
              <TableHead>Outcome</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skel-${i}`}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  No AI reviews found
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => (
                <AiReviewsRow
                  key={review.id}
                  review={review}
                  flagged={review.attempts_for_progress > attemptFlagThreshold}
                  onClick={() => setSelectedReview(review)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {reviews.length} of {total} reviews
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AiReviewDetailDialog
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
}
