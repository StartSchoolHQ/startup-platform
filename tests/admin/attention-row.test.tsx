// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AttentionRowItem } from "@/components/admin/analytics/this-week/attention-row";
import type { AttentionRow } from "@/lib/analytics/attention";

const row: AttentionRow = {
  user_id: "u1",
  name: "Anna Bērziņa",
  team_name: "Lovat",
  last_active: new Date(Date.now() - 3 * 86400000).toISOString(),
  severity: 4,
  reasons: [
    "No activity for 9 days",
    "Stuck on “Interview 3 users” for 12 days",
  ],
  dismissed_until: null as unknown as string,
};

describe("AttentionRowItem", () => {
  it("shows every reason and the team", () => {
    render(<AttentionRowItem row={row} onDismiss={vi.fn()} />);
    expect(screen.getByText("Anna Bērziņa")).toBeTruthy();
    expect(screen.getByText("Lovat")).toBeTruthy();
    expect(screen.getByText("No activity for 9 days")).toBeTruthy();
    expect(screen.getByText(/Stuck on/)).toBeTruthy();
    expect(screen.getByText(/3 days ago/)).toBeTruthy();
  });

  it("asks the parent to dismiss with the student's id", () => {
    const onDismiss = vi.fn();
    render(<AttentionRowItem row={row} onDismiss={onDismiss} />);
    screen.getByRole("button", { name: /dismiss/i }).click();
    expect(onDismiss).toHaveBeenCalledWith("u1");
  });

  it("hides the dismiss button on an already dismissed row", () => {
    render(
      <AttentionRowItem
        row={{ ...row, dismissed_until: "2099-01-01T00:00:00Z" }}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
    expect(screen.getByText(/dismissed until/i)).toBeTruthy();
  });
});
