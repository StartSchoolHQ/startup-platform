"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, type TaskStatus } from "@/components/ui/status-badge";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  UserX,
  Loader2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PeerReviewDetailDialog } from "./peer-review-detail-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface PeerReviewRow {
  id: string;
  status: TaskStatus;
  submission_data: Record<string, unknown> | string | null;
  review_feedback: string | null;
  peer_review_history: Array<Record<string, unknown>>;
  completed_at: string | null;
  reviewed_at: string | null;
  task: { id: string; title: string; category: string } | null;
  team: { id: string; name: string } | null;
  submitter: { id: string; name: string; avatar_url: string | null } | null;
  reviewer: { id: string; name: string; avatar_url: string | null } | null;
}

function getReviewerAssignedDate(
  history: Array<Record<string, unknown>>
): string | null {
  const assigned = [...history]
    .reverse()
    .find((e) => e.event_type === "reviewer_assigned");
  return (assigned?.timestamp as string) || null;
}

function relativeDate(date: string | null): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "1d ago";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function daysSince(date: string | null): number {
  if (!date) return 0;
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

export function AdminPeerReviewsTable() {
  const [reviews, setReviews] = useState<PeerReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedReview, setSelectedReview] = useState<PeerReviewRow | null>(
    null
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const limit = 25;
  const abortRef = useRef<AbortController | null>(null);
  const fetchVersion = useRef(0);

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
    });

    fetch(`/api/admin/peer-reviews?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (version === fetchVersion.current) {
          setReviews(data.data || []);
          setTotal(data.total || 0);
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
  }, [page, search, statusFilter]);

  const handleRemoveReviewer = async (
    e: React.MouseEvent,
    reviewId: string
  ) => {
    e.stopPropagation();
    setRemovingId(reviewId);

    try {
      const res = await fetch("/api/admin/peer-reviews/remove-reviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskProgressId: reviewId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove reviewer");
      }

      toast.success("Reviewer removed — task is back in available reviews");
      fetchReviews();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove reviewer"
      );
    } finally {
      setRemovingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  // Summary stats
  const pendingCount = reviews.filter(
    (r) => r.status === "pending_review"
  ).length;
  const approvedCount = reviews.filter((r) => r.status === "approved").length;
  const unassignedCount = reviews.filter(
    (r) => r.status === "pending_review" && !r.reviewer
  ).length;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {!loading && reviews.length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">
            Total: <span className="text-foreground font-medium">{total}</span>
          </span>
          <span className="text-muted-foreground">
            Pending:{" "}
            <span className="font-medium text-amber-600">{pendingCount}</span>
          </span>
          <span className="text-muted-foreground">
            Approved:{" "}
            <span className="font-medium text-emerald-600">
              {approvedCount}
            </span>
          </span>
          {unassignedCount > 0 && (
            <span className="text-muted-foreground">
              No reviewer:{" "}
              <span className="font-medium text-red-500">
                {unassignedCount}
              </span>
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
          <Input
            placeholder="Search by task, team, or name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead>Reviewed</TableHead>
              <TableHead className="w-[60px]" />
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
                  No peer reviews found
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => {
                const assignedDate = getReviewerAssignedDate(
                  review.peer_review_history
                );
                const waitingDays = daysSince(assignedDate);
                const isOverdue =
                  review.status === "pending_review" &&
                  review.reviewer &&
                  waitingDays > 7;

                return (
                  <TableRow
                    key={review.id}
                    className={cn(
                      "hover:bg-muted/50 cursor-pointer",
                      isOverdue && "bg-red-50/50 dark:bg-red-950/10"
                    )}
                    onClick={() => setSelectedReview(review)}
                  >
                    <TableCell className="max-w-[200px] truncate font-medium">
                      {review.task?.title || "—"}
                    </TableCell>
                    <TableCell>{review.team?.name || "—"}</TableCell>
                    <TableCell>{review.submitter?.name || "—"}</TableCell>
                    <TableCell>
                      {review.reviewer ? (
                        <div>
                          <span className="font-medium">
                            {review.reviewer.name}
                          </span>
                          {review.status === "pending_review" &&
                            assignedDate && (
                              <span
                                className={cn(
                                  "ml-1.5 text-xs",
                                  waitingDays > 7
                                    ? "font-medium text-red-500"
                                    : "text-muted-foreground"
                                )}
                              >
                                ({relativeDate(assignedDate)})
                              </span>
                            )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">
                          Not assigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={review.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {relativeDate(review.completed_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {relativeDate(review.reviewed_at)}
                    </TableCell>
                    <TableCell>
                      {review.status === "pending_review" &&
                        review.reviewer && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                                  disabled={removingId === review.id}
                                  onClick={(e) =>
                                    handleRemoveReviewer(e, review.id)
                                  }
                                >
                                  {removingId === review.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <UserX className="h-4 w-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Remove reviewer — task goes back to available
                                pool
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
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

      {/* Detail Dialog */}
      <PeerReviewDetailDialog
        review={selectedReview}
        onClose={() => setSelectedReview(null)}
      />
    </div>
  );
}
