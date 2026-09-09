import type { AiReviewAdminRow } from "@/types/ai-review-admin";

export function VerdictSection({ review }: { review: AiReviewAdminRow }) {
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm md:grid-cols-4">
      <div>
        <span className="text-muted-foreground block text-xs">Decision</span>
        <span className="font-medium">
          {review.decision === null
            ? "—"
            : review.decision
              ? "Approved"
              : "Rejected"}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Confidence</span>
        <span className="font-medium">
          {review.confidence != null
            ? `${Math.round(review.confidence * 100)}%`
            : "—"}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">
          Reject reason
        </span>
        <span className="font-medium">{review.reject_reason || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Model</span>
        <span className="font-medium">{review.model || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">Cost</span>
        <span className="font-medium">
          {review.cost_usd != null ? `$${review.cost_usd.toFixed(4)}` : "—"}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground block text-xs">
          Tokens (in / out)
        </span>
        <span className="font-medium">
          {review.input_tokens ?? "—"} / {review.output_tokens ?? "—"}
        </span>
      </div>
      {review.error && (
        <div className="col-span-2 md:col-span-4">
          <span className="text-muted-foreground block text-xs">Error</span>
          <span className="font-medium text-red-600">{review.error}</span>
        </div>
      )}
    </div>
  );
}
