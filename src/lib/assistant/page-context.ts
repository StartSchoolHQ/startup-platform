import type { PageContext } from "./types";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_ROUTE = /^\/dashboard\/(?:my-journey|team-journey)\/task\/([^/?#]+)/;
const MAX_ROUTE = 200;

/** Turns the current pathname into what the chat route accepts. Client-safe. */
export function getPageContext(pathname: string): PageContext {
  const route = pathname.split(/[?#]/)[0].slice(0, MAX_ROUTE);
  const match = TASK_ROUTE.exec(route);
  const candidate = match?.[1];
  return candidate && UUID.test(candidate)
    ? { route, taskId: candidate }
    : { route };
}
