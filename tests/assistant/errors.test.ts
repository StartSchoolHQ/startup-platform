import { describe, expect, it } from "vitest";
import { mapAssistantRpcError } from "@/lib/assistant/errors";

describe("mapAssistantRpcError", () => {
  it.each([
    ["ASSISTANT_LIMIT_REACHED", 429],
    ["THREAD_NOT_FOUND", 404],
    ["INVALID_CONTENT", 400],
    ["NOT_AUTHENTICATED", 403],
    ["something exploded", 500],
  ])("maps %s to %i", (message, status) => {
    expect(mapAssistantRpcError(message).status).toBe(status);
  });

  it("never echoes the raw database message", () => {
    const { error } = mapAssistantRpcError(
      'relation "assistant_messages" does not exist'
    );
    expect(error).not.toContain("relation");
    expect(error.length).toBeGreaterThan(10);
  });

  it("gives the limit a message a student understands", () => {
    expect(mapAssistantRpcError("ASSISTANT_LIMIT_REACHED").error).toMatch(
      /today/i
    );
  });
});
