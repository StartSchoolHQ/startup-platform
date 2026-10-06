import { beforeEach, describe, expect, it, vi } from "vitest";
import posthog from "posthog-js";
import { track } from "@/lib/analytics/events";

vi.mock("posthog-js", () => ({ default: { capture: vi.fn() } }));

describe("track", () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockReset();
  });

  it("forwards the event name and flat properties to PostHog", () => {
    track("individual_task_started", { task_id: "t1", task_title: "Mom Test" });
    expect(posthog.capture).toHaveBeenCalledWith("individual_task_started", {
      task_id: "t1",
      task_title: "Mom Test",
    });
  });

  it("never throws when PostHog fails", () => {
    vi.mocked(posthog.capture).mockImplementation(() => {
      throw new Error("not loaded");
    });
    expect(() => track("startie_opened", { page: "/dashboard" })).not.toThrow();
  });
});
