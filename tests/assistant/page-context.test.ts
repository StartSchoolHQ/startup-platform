import { describe, expect, it } from "vitest";
import { getPageContext } from "@/lib/assistant/page-context";

const TASK = "3f1c0e7a-7d3e-4d6f-9a1b-2c3d4e5f6a7b";

describe("getPageContext", () => {
  it("extracts the task id from a My Journey task page", () => {
    expect(getPageContext(`/dashboard/my-journey/task/${TASK}`)).toEqual({
      route: `/dashboard/my-journey/task/${TASK}`,
      taskId: TASK,
    });
  });

  it("extracts the task id from a Team Journey task page", () => {
    expect(getPageContext(`/dashboard/team-journey/task/${TASK}`).taskId).toBe(
      TASK
    );
  });

  it("carries no task id on other pages", () => {
    expect(getPageContext("/dashboard/leaderboard")).toEqual({
      route: "/dashboard/leaderboard",
    });
  });

  it("ignores a task segment that is not a uuid", () => {
    expect(
      getPageContext("/dashboard/my-journey/task/new").taskId
    ).toBeUndefined();
  });

  it("drops query strings and caps the route length", () => {
    const long = `/dashboard/${"x".repeat(300)}?tab=1`;
    const { route } = getPageContext(long);
    expect(route).not.toContain("?");
    expect(route.length).toBeLessThanOrEqual(200);
  });
});
