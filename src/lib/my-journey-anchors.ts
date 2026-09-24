/**
 * In-page anchors on /dashboard/my-journey. The Continue and Next up cards
 * render on that same page, so a link to the bare route is a no-op; they
 * link to the task list instead.
 */
export const MY_JOURNEY_TASKS_ANCHOR = "tasks";

export const MY_JOURNEY_TASKS_HREF = `/dashboard/my-journey#${MY_JOURNEY_TASKS_ANCHOR}`;
