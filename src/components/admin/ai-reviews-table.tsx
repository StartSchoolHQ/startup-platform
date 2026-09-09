"use client";

import { useEffect, useRef, useState } from "react";
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
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAiReviewSettings } from "@/hooks/use-ai-review-settings";
import { AiReviewsSummary } from "./ai-reviews-summary";
import { AiReviewsFilters } from "./ai-reviews-filters";
import { AiReviewsRow } from "./ai-reviews-row";
import { AiReviewDetailDialog } from "./ai-review-detail-dialog";
import type {
  AiReviewAdminResponse,
  AiReviewAdminRow,
  AiReviewAdminSummary,
} from "@/types/ai-review-admin";

const SEARCH_DEBOUNCE_MS = 300;
const LOAD_ERROR = "Couldn't load AI reviews — try again.";

export function AiReviewsTable() {
  const [reviews, setReviews] = useState<AiReviewAdminRow[]>([]);
  const [summary, setSummary] = useState<AiReviewAdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
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

  // Reuse the Task 16 settings hook (shared TanStack Query cache — no
  // duplicate query when the settings card is mounted on the same page).
  const { data: settings } = useAiReviewSettings();
  const attemptFlagThreshold = settings.attemptFlagThreshold;

  // Debounce the free-text search — every keystroke would otherwise fire a
  // request (main query + attempts subquery + full summary scan).
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

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
      .then(async (res) => {
        // A 401/403/500 still resolves the promise — without this an error
        // body would be rendered as "No AI reviews found".
        if (!res.ok) throw new Error(`request failed (${res.status})`);
        return (await res.json()) as AiReviewAdminResponse;
      })
      .then((data) => {
        if (version === fetchVersion.current) {
          setReviews(data.data || []);
          setTotal(data.total || 0);
          setSummary(data.summary ?? null);
          setLoadError(null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return;
        if (version !== fetchVersion.current) return;
        setReviews([]);
        setTotal(0);
        setLoadError(LOAD_ERROR);
        setLoading(false);
        toast.error(LOAD_ERROR);
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
        search={searchInput}
        onSearchChange={setSearchInput}
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
            ) : loadError ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center">
                  <span className="text-destructive inline-flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {loadError}
                  </span>
                </TableCell>
              </TableRow>
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
