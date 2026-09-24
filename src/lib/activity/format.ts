/**
 * Turns one row of `get_admin_activity_v1` into a sentence a non-developer
 * can read. Every kind gets a badge, a tone and a plain-English line that
 * always names the student it happened to.
 */
export const ACTIVITY_KINDS = [
  "task_started",
  "task_submitted",
  "task_approved",
  "task_rejected",
  "xp",
  "strike_issued",
  "strike_explained",
  "strike_resolved",
  "meeting_logged",
  "weekly_report",
  "achievement",
  "ticket",
  "ticket_resolved",
  "suggestion",
  "suggestion_reviewed",
  "startie_chat",
  "account_joined",
  "account_status",
  "account_role",
  "account_batch",
  "account_name",
  "team_joined",
  "team_left",
] as const;

export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

/** Shape of one `get_admin_activity_v1` row. */
export interface ActivityRow {
  id: string;
  occurred_at: string;
  kind: ActivityKind;
  subject_user_id: string | null;
  subject_name: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  team_name: string | null;
  object_title: string | null;
  amount_xp: number | null;
  amount_points: number | null;
  status: string | null;
  detail: string | null;
  ref_id: string | null;
  extra: Record<string, unknown>;
}

export type ActivityTone = "positive" | "negative" | "warning" | "neutral";

export interface FormattedActivity {
  text: string;
  badge: string;
  tone: ActivityTone;
  /** Longer text shown when the row is expanded (feedback, description). */
  detail: string | null;
  href: string | null;
}

/** Badge groups the kind filter chips are built from. */
export const ACTIVITY_GROUPS: { badge: string; kinds: ActivityKind[] }[] = [
  {
    badge: "Tasks",
    kinds: ["task_started", "task_submitted", "task_approved", "task_rejected"],
  },
  { badge: "XP", kinds: ["xp"] },
  {
    badge: "Strikes",
    kinds: ["strike_issued", "strike_explained", "strike_resolved"],
  },
  { badge: "Meetings", kinds: ["meeting_logged"] },
  { badge: "Reports", kinds: ["weekly_report"] },
  { badge: "Phases", kinds: ["achievement"] },
  {
    badge: "Support",
    kinds: ["ticket", "ticket_resolved", "suggestion", "suggestion_reviewed"],
  },
  { badge: "Startie", kinds: ["startie_chat"] },
  {
    badge: "Accounts",
    kinds: [
      "account_joined",
      "account_status",
      "account_role",
      "account_batch",
      "account_name",
    ],
  },
  { badge: "Teams", kinds: ["team_joined", "team_left"] },
];

const BADGE_BY_KIND = new Map<string, string>(
  ACTIVITY_GROUPS.flatMap((g) => g.kinds.map((k) => [k, g.badge] as const))
);

const q = (s: string | null) => `“${s ?? "untitled"}”`;
const inTeam = (team: string | null) => (team ? ` (${team})` : "");

function xpSentence(who: string, row: ActivityRow): string {
  const economy = row.extra?.economy === "my_journey" ? "My Journey" : "Team";
  const xp = row.amount_xp ?? 0;
  const pts = row.amount_points ?? 0;
  const parts: string[] = [];
  if (xp !== 0) parts.push(`${Math.abs(xp)} ${economy} XP`);
  if (pts !== 0) {
    const unit = economy === "Team" ? "Team Points" : "My Journey Credits";
    parts.push(`${Math.abs(pts)} ${unit}`);
  }
  if (parts.length === 0) return `${who} had an XP adjustment`;
  const verb = xp < 0 || pts < 0 ? "lost" : "earned";
  return `${who} ${verb} ${parts.join(" and ")}`;
}

export function formatActivity(row: ActivityRow): FormattedActivity {
  const who = row.subject_name ?? "A student";
  const actor = row.actor_name;
  // Only ai_task_reviews rows carry decided_by; a team review with no
  // reviewer recorded is still a human decision we cannot name.
  const reviewer =
    actor ?? (row.extra?.decided_by ? "AI reviewer" : "A reviewer");
  const team = row.team_name;
  const title = row.object_title;
  const xp = row.amount_xp ? `, +${row.amount_xp} XP` : "";
  const badge = BADGE_BY_KIND.get(row.kind) ?? "Other";
  let text: string;
  let tone: ActivityTone = "neutral";
  let detail: string | null = row.detail;
  let href: string | null = null;

  switch (row.kind) {
    case "task_started":
      text = `${who} started ${q(title)}`;
      break;
    case "task_submitted":
      text = `${who} submitted ${q(title)} for review`;
      break;
    case "task_approved":
      text = `${reviewer} approved ${q(title)} for ${who}${xp}`;
      tone = "positive";
      break;
    case "task_rejected":
      text = `${reviewer} sent ${q(title)} back to ${who}`;
      tone = "warning";
      break;
    case "xp":
      text = xpSentence(who, row);
      tone =
        (row.amount_xp ?? 0) < 0 || (row.amount_points ?? 0) < 0
          ? "negative"
          : "positive";
      break;
    case "strike_issued":
      text = `${who} got a strike: ${title ?? "no title"}${inTeam(team)}`;
      tone = "negative";
      break;
    case "strike_explained":
      text = `${who} explained their strike${inTeam(team)}`;
      break;
    case "strike_resolved":
      text = `${actor ?? "The system"} resolved ${who}'s strike`;
      tone = "positive";
      break;
    case "meeting_logged":
      text = `${who} logged a client meeting with ${title ?? "a client"}${inTeam(team)}`;
      break;
    case "weekly_report": {
      const week = row.extra?.week_number;
      const when = week ? ` for week ${week}` : "";
      text = team
        ? `${who} submitted the weekly report for ${team}${when}`
        : `${who} submitted their solo weekly report${when}`;
      break;
    }
    case "achievement":
      text = `${who} completed the phase ${q(title)}${xp}`;
      tone = "positive";
      break;
    case "ticket":
      text = `${who} reported a problem: ${q(title)}`;
      href = "/dashboard/admin/inbox";
      break;
    case "ticket_resolved":
      text = `${actor ?? "An admin"} resolved ${who}'s ticket ${q(title)}`;
      tone = "positive";
      href = "/dashboard/admin/inbox";
      break;
    case "suggestion":
      text = `${who} suggested a task: ${q(title)}`;
      href = "/dashboard/admin/inbox?tab=task-suggestions";
      break;
    case "suggestion_reviewed":
      text = `${actor ?? "An admin"} ${row.status === "accepted" ? "accepted" : "declined"} ${who}'s task suggestion ${q(title)}`;
      href = "/dashboard/admin/inbox?tab=task-suggestions";
      break;
    case "startie_chat":
      text = `${who} started a Startie chat: ${q(title)}`;
      href = "/dashboard/admin/inbox?tab=startie";
      break;
    case "account_joined":
      text = `${who} joined the platform`;
      tone = "positive";
      break;
    case "account_status":
      text = actor
        ? `${actor} set ${who}'s account to ${row.status ?? "unknown"}`
        : `${who}'s account was set to ${row.status ?? "unknown"}`;
      tone = row.status === "active" ? "positive" : "warning";
      break;
    case "account_role":
      text = `${who} is now ${row.status === "admin" ? "an admin" : "a student"}`;
      break;
    case "account_batch":
      text = title
        ? `${who} was assigned to the batch ${title}`
        : `${who}'s batch was changed`;
      break;
    case "account_name": {
      const old = row.extra?.old_name;
      text = old ? `${old} is now called ${who}` : `${who} changed their name`;
      break;
    }
    case "team_joined":
      text = `${who} joined the team ${team ?? "(deleted team)"}`;
      break;
    case "team_left":
      text = `${who} left the team ${team ?? "(deleted team)"}`;
      tone = "warning";
      break;
    default:
      text = `Something happened for ${who}`;
      detail = row.detail ?? `Event type: ${row.kind}`;
  }

  return { text, badge, tone, detail, href };
}
