/**
 * Audit Log Formatter V2
 * Converts raw audit log data into human-readable descriptions
 * Designed for non-technical admins
 */

export interface AuditLogV2 {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_fields: string[] | null;
  changed_by_user_id: string | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  affected_user_name: string | null;
  affected_team_name: string | null;
  category: string;
  created_at: string;
}

export interface FormattedAuditLogV2 {
  /** Main human-readable sentence describing what happened */
  summary: string;
  /** Icon emoji for the action */
  icon: string;
  /** Category badge label */
  categoryLabel: string;
  /** Category badge color class */
  categoryColor: string;
  /** Optional details to show expanded */
  details: string | null;
  /** Whether to hide the raw data section by default */
  hideRawData: boolean;
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  team: {
    label: "Team Activity",
    color: "bg-blue-100 text-blue-800",
    icon: "👥",
  },
  task: {
    label: "Tasks",
    color: "bg-purple-100 text-purple-800",
    icon: "✅",
  },
  strike: {
    label: "Strikes",
    color: "bg-red-100 text-red-800",
    icon: "⚠️",
  },
  report: {
    label: "Reports",
    color: "bg-green-100 text-green-800",
    icon: "📊",
  },
  meeting: {
    label: "Meetings",
    color: "bg-yellow-100 text-yellow-800",
    icon: "📅",
  },
  user: {
    label: "User Profile",
    color: "bg-gray-100 text-gray-800",
    icon: "👤",
  },
  other: {
    label: "Other",
    color: "bg-gray-100 text-gray-600",
    icon: "📝",
  },
};

/**
 * Generate a human-readable summary for a team-related log
 */
function formatTeamActivity(log: AuditLogV2): string {
  const actor = log.changed_by_name || "Someone";
  const team = log.affected_team_name || "a team";
  const user = log.affected_user_name;

  // Team member joined
  if (log.table_name === "team_members" && log.action === "INSERT") {
    return `${user || actor} joined ${team}`;
  }

  // Team member left
  if (
    log.table_name === "team_members" &&
    log.action === "UPDATE" &&
    log.new_data?.left_at
  ) {
    return `${user || actor} left ${team}`;
  }

  // Team invitation accepted
  if (log.table_name === "team_invitations" && log.action === "UPDATE") {
    const oldStatus = log.old_data?.status;
    const newStatus = log.new_data?.status;

    if (oldStatus === "pending" && newStatus === "accepted") {
      return `${actor} accepted invitation to join ${team}`;
    }
    if (oldStatus === "pending" && newStatus === "declined") {
      return `${actor} declined invitation to join ${team}`;
    }
    if (newStatus === "cancelled") {
      return `Invitation to ${team} was cancelled`;
    }
  }

  // Team invitation sent
  if (log.table_name === "team_invitations" && log.action === "INSERT") {
    return `${actor} invited someone to join ${team}`;
  }

  // Team created
  if (log.table_name === "teams" && log.action === "INSERT") {
    return `${actor} created team "${team}"`;
  }

  // Team updated
  if (log.table_name === "teams" && log.action === "UPDATE") {
    const fields = log.changed_fields || [];

    if (fields.includes("member_count")) {
      const oldCount = log.old_data?.member_count as number;
      const newCount = log.new_data?.member_count as number;
      if (newCount > oldCount) {
        return `${team} grew to ${newCount} members`;
      } else {
        return `${team} now has ${newCount} members`;
      }
    }

    if (fields.includes("name")) {
      const oldName = log.old_data?.name;
      return `Team renamed from "${oldName}" to "${team}"`;
    }

    if (fields.includes("description")) {
      return `${team} description was updated`;
    }

    return `${team} was updated`;
  }

  return `${actor} made changes to ${team}`;
}

/**
 * Generate a human-readable summary for a strike-related log
 */
function formatStrikeActivity(log: AuditLogV2): string {
  const team = log.affected_team_name || "a team";

  if (log.action === "INSERT") {
    const reason = log.new_data?.reason as string;
    return reason
      ? `${team} received a strike: ${reason}`
      : `${team} received a strike`;
  }

  if (log.action === "UPDATE") {
    const newStatus = log.new_data?.status;
    if (newStatus === "resolved") {
      return `Strike against ${team} was resolved`;
    }
  }

  return `Strike activity for ${team}`;
}

/**
 * Generate a human-readable summary for a report-related log
 */
function formatReportActivity(log: AuditLogV2): string {
  const actor = log.changed_by_name || "Someone";

  if (log.action === "INSERT") {
    const weekNum = log.new_data?.week_number;
    return weekNum
      ? `${actor} submitted weekly report for week ${weekNum}`
      : `${actor} submitted a weekly report`;
  }

  if (log.action === "UPDATE") {
    return `${actor} updated their weekly report`;
  }

  return `${actor} made changes to a weekly report`;
}

/**
 * Generate a human-readable summary for a meeting-related log
 */
function formatMeetingActivity(log: AuditLogV2): string {
  const actor = log.changed_by_name || "Someone";
  const team = log.affected_team_name;

  if (log.action === "INSERT") {
    return team
      ? `${actor} logged a client meeting for ${team}`
      : `${actor} logged a client meeting`;
  }

  if (log.action === "UPDATE") {
    const newStatus = log.new_data?.status;
    if (newStatus === "approved") {
      return team
        ? `Client meeting for ${team} was approved`
        : "Client meeting was approved";
    }
    if (newStatus === "rejected") {
      return team
        ? `Client meeting for ${team} was rejected`
        : "Client meeting was rejected";
    }
  }

  return `${actor} updated a client meeting`;
}

/**
 * Generate a human-readable summary for a user-related log
 */
function formatUserActivity(log: AuditLogV2): string {
  const user = log.affected_user_name || log.changed_by_name || "A user";
  const fields = log.changed_fields || [];

  if (log.action === "INSERT") {
    return `${user} joined the platform`;
  }

  if (log.action === "UPDATE") {
    if (fields.includes("name")) {
      const oldName = log.old_data?.name;
      const newName = log.new_data?.name;
      return `${oldName} changed their name to ${newName}`;
    }

    if (fields.includes("avatar_url")) {
      return `${user} updated their profile picture`;
    }

    if (fields.includes("status")) {
      const newStatus = log.new_data?.status;
      return `${user}'s status changed to ${newStatus}`;
    }

    if (fields.includes("primary_role")) {
      const newRole = log.new_data?.primary_role;
      return `${user} was assigned the ${newRole} role`;
    }

    // Filter out XP/points changes - shouldn't reach here due to SQL filter
    const meaningfulFields = fields.filter(
      (f) =>
        ![
          "total_xp",
          "total_points",
          "updated_at",
          "daily_validation_xp",
        ].includes(f)
    );
    if (meaningfulFields.length > 0) {
      return `${user}'s profile was updated`;
    }
  }

  return `${user}'s account was updated`;
}

/**
 * Generate a human-readable summary for a task-related log
 */
function formatTaskActivity(log: AuditLogV2): string {
  const actor = log.changed_by_name || "Someone";

  if (log.table_name === "task_progress") {
    const newStatus = log.new_data?.status;

    if (log.action === "INSERT") {
      return `${actor} started a task`;
    }

    if (newStatus === "completed") {
      return `${actor} completed a task`;
    }
    if (newStatus === "approved") {
      return `${actor}'s task was approved`;
    }
    if (newStatus === "rejected") {
      return `${actor}'s task was rejected`;
    }
  }

  if (log.table_name === "tasks") {
    const title = (log.new_data?.title || log.old_data?.title) as string;
    if (log.action === "INSERT") {
      return title ? `New task created: "${title}"` : "New task was created";
    }
    if (log.action === "UPDATE") {
      return title ? `Task "${title}" was updated` : "A task was updated";
    }
    if (log.action === "DELETE") {
      return title ? `Task "${title}" was deleted` : "A task was deleted";
    }
  }

  return `${actor} made changes to a task`;
}

/**
 * Format audit log for display with human-readable content
 */
export function formatAuditLogV2(log: AuditLogV2): FormattedAuditLogV2 {
  const category = log.category || "other";
  const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other;

  let summary: string;
  let details: string | null = null;

  switch (category) {
    case "team":
      summary = formatTeamActivity(log);
      break;
    case "strike":
      summary = formatStrikeActivity(log);
      break;
    case "report":
      summary = formatReportActivity(log);
      break;
    case "meeting":
      summary = formatMeetingActivity(log);
      break;
    case "user":
      summary = formatUserActivity(log);
      break;
    case "task":
      summary = formatTaskActivity(log);
      break;
    default:
      summary = `${log.changed_by_name || "Someone"} made changes to ${log.table_name}`;
  }

  // Add details for field changes if relevant
  if (
    log.changed_fields &&
    log.changed_fields.length > 0 &&
    log.old_data &&
    log.new_data
  ) {
    const meaningfulChanges = log.changed_fields.filter(
      (f) =>
        ![
          "updated_at",
          "created_at",
          "total_xp",
          "total_points",
          "daily_validation_xp",
        ].includes(f)
    );

    if (meaningfulChanges.length > 0 && meaningfulChanges.length <= 3) {
      const changeStrings = meaningfulChanges.map((field) => {
        const oldVal = formatValueForDisplay(log.old_data?.[field]);
        const newVal = formatValueForDisplay(log.new_data?.[field]);
        const fieldName = formatFieldName(field);
        return `${fieldName}: ${oldVal} → ${newVal}`;
      });
      details = changeStrings.join(", ");
    }
  }

  return {
    summary,
    icon: config.icon,
    categoryLabel: config.label,
    categoryColor: config.color,
    details,
    hideRawData: true,
  };
}

/**
 * Format a field name for display
 */
function formatFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    team_role: "Role",
    member_count: "Members",
    strikes_count: "Strikes",
    status: "Status",
    description: "Description",
    name: "Name",
    logo_url: "Logo",
    website: "Website",
  };

  if (fieldNames[field]) return fieldNames[field];

  return field
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format a value for display
 */
function formatValueForDisplay(value: unknown): string {
  if (value === null || value === undefined) return "none";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") {
    // Handle dates
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
    // Truncate long strings
    if (value.length > 50) {
      return value.substring(0, 47) + "...";
    }
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Format reward/transaction for display
 */
export interface RewardActivity {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  team_name: string | null;
  task_title: string | null;
  type: string;
  activity_type: string;
  description: string;
  xp_change: number;
  points_change: number;
  week_number: number | null;
  created_at: string;
}

export interface FormattedReward {
  summary: string;
  icon: string;
  xpBadge: string;
  pointsBadge: string;
}

export function formatRewardActivity(reward: RewardActivity): FormattedReward {
  const user = reward.user_name || "Someone";
  const xpSign = reward.xp_change >= 0 ? "+" : "";
  const pointsSign = reward.points_change >= 0 ? "+" : "";

  let summary = reward.description || `${user} received rewards`;
  let icon = "⭐";

  // Clean up the summary if it starts with "Task completed:"
  if (summary.startsWith("Task completed:")) {
    const taskName = summary.replace("Task completed:", "").trim();
    summary = `${user} completed "${taskName}"`;
    icon = "✅";
  } else if (summary.includes("meeting")) {
    icon = "📅";
  } else if (summary.includes("peer review") || summary.includes("validated")) {
    icon = "👍";
  } else if (summary.includes("weekly report")) {
    icon = "📊";
  }

  return {
    summary,
    icon,
    xpBadge: `${xpSign}${reward.xp_change} XP`,
    pointsBadge: `${pointsSign}${reward.points_change} pts`,
  };
}
