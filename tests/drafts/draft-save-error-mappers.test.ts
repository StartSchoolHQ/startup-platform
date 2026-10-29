import { afterEach, describe, expect, it, vi } from "vitest";
import { mapTaskDraftSaveError } from "@/lib/data/task-drafts";
import { mapIndividualDraftAutosaveError } from "@/lib/individual-weekly-report";
import { mapTeamDraftAutosaveError } from "@/lib/team-weekly-report";

const FALLBACK = "Not saved, check your connection";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("autosave error mappers", () => {
  it("map known codes to their own line", () => {
    expect(mapTaskDraftSaveError("task_draft_status_locked: pending")).toBe(
      "This task was already submitted."
    );
    expect(mapTaskDraftSaveError("task_draft_denied")).toBe(
      "You can't edit this task."
    );
    expect(mapIndividualDraftAutosaveError("ALREADY_SUBMITTED")).toBe(
      "This week's report was already submitted."
    );
    expect(
      mapTeamDraftAutosaveError("Report has already been submitted for week")
    ).toBe("This week's report was already submitted.");
  });

  it("never show raw network or PostgREST text; log it instead", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const map of [
      mapTaskDraftSaveError,
      mapIndividualDraftAutosaveError,
      mapTeamDraftAutosaveError,
    ]) {
      expect(map("TypeError: Failed to fetch")).toBe(FALLBACK);
      expect(map("Failed to save draft: JWT expired")).toBe(FALLBACK);
    }
    expect(log).toHaveBeenCalledTimes(6);
  });
});
