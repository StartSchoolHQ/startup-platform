import { describe, expect, it } from "vitest";
import { TaskSuggestionSchema } from "@/lib/validation-schemas";
import {
  mapSuggestTaskError,
  SUGGESTION_LIMIT_MESSAGE,
} from "@/lib/task-suggestions";

const PHASE = "1d93efc0-b669-4034-a9b4-937eea01a767";

describe("TaskSuggestionSchema", () => {
  it("accepts a well-formed suggestion and trims text", () => {
    const parsed = TaskSuggestionSchema.parse({
      achievementId: PHASE,
      title: "  Read The Mom Test book  ",
      description: "Learn how to ask questions that get honest answers.",
    });
    expect(parsed.title).toBe("Read The Mom Test book");
  });
  it("rejects a short title, a long description and a bad phase id", () => {
    expect(
      TaskSuggestionSchema.safeParse({
        achievementId: PHASE,
        title: "Hi",
        description: "Learn how to ask questions that get honest answers.",
      }).success
    ).toBe(false);
    expect(
      TaskSuggestionSchema.safeParse({
        achievementId: PHASE,
        title: "Read The Mom Test book",
        description: "x".repeat(301),
      }).success
    ).toBe(false);
    expect(
      TaskSuggestionSchema.safeParse({
        achievementId: "nope",
        title: "Read The Mom Test book",
        description: "Learn how to ask questions that get honest answers.",
      }).success
    ).toBe(false);
  });
});

describe("mapSuggestTaskError", () => {
  it("maps the limit error to the exact student copy", () => {
    expect(mapSuggestTaskError({ message: "SUGGESTION_LIMIT_REACHED" })).toBe(
      SUGGESTION_LIMIT_MESSAGE
    );
  });
  it("maps validation errors and falls back for the rest", () => {
    expect(mapSuggestTaskError({ message: "INVALID_PHASE" })).toBe(
      "Pick a phase from the list."
    );
    expect(mapSuggestTaskError({ message: "INVALID_TITLE" })).toBe(
      "Title must be 5–80 characters."
    );
    expect(mapSuggestTaskError({ message: "INVALID_DESCRIPTION" })).toBe(
      "Description must be 10–300 characters."
    );
    expect(mapSuggestTaskError(null)).toBe(
      "Couldn't send the suggestion. Please try again."
    );
  });
});
