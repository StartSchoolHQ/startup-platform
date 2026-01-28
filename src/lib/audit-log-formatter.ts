/**
 * Audit Log Formatter
 * Converts raw audit log data into human-readable descriptions
 */

interface AuditLog {
  table_name: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  changed_fields: string[] | null;
  changed_by_name: string | null;
}

interface FormattedAuditLog {
  title: string;
  description: string;
  icon: string;
  changes: Array<{ field: string; oldValue: any; newValue: any }>;
}

/**
 * Get a friendly name for a table
 */
function getTableDisplayName(tableName: string): string {
  const tableNames: Record<string, string> = {
    users: "User",
    teams: "Team",
    team_members: "Team Member",
    team_invitations: "Team Invitation",
    tasks: "Task",
    task_progress: "Task Progress",
    transactions: "Transaction",
    team_strikes: "Team Strike",
    weekly_reports: "Weekly Report",
    client_meetings: "Client Meeting",
    achievements: "Achievement",
    revenue_streams: "Revenue Stream",
    notifications: "Notification",
  };
  return tableNames[tableName] || tableName;
}

/**
 * Get a friendly name for a field
 */
function getFieldDisplayName(field: string): string {
  const fieldNames: Record<string, string> = {
    team_id: "Team",
    user_id: "User",
    created_at: "Created",
    updated_at: "Updated",
    responded_at: "Responded",
    joined_at: "Joined",
    left_at: "Left",
    team_role: "Role",
    invited_user_id: "Invited User",
    invited_by_user_id: "Invited By",
    status: "Status",
  };

  // Convert snake_case to Title Case if not in map
  if (fieldNames[field]) return fieldNames[field];

  return field
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format a value for display
 */
function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    // Handle dates
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Get specific description for common table changes
 */
function getSpecificDescription(log: AuditLog): string | null {
  const { table_name, action, old_data, new_data } = log;

  // Team Invitations
  if (table_name === "team_invitations" && action === "UPDATE") {
    const oldStatus = old_data?.status;
    const newStatus = new_data?.status;

    if (oldStatus === "pending" && newStatus === "accepted") {
      return "accepted team invitation";
    }
    if (oldStatus === "pending" && newStatus === "declined") {
      return "declined team invitation";
    }
    if (newStatus === "cancelled") {
      return "cancelled team invitation";
    }
  }

  // Team Members
  if (table_name === "team_members" && action === "INSERT") {
    return "joined team";
  }
  if (
    table_name === "team_members" &&
    action === "UPDATE" &&
    new_data?.left_at
  ) {
    return "left team";
  }

  // Team Strikes
  if (table_name === "team_strikes") {
    if (action === "INSERT") return "received team strike";
    if (action === "UPDATE" && new_data?.status === "resolved") {
      return "strike was resolved";
    }
  }

  // Weekly Reports
  if (table_name === "weekly_reports" && action === "INSERT") {
    return "submitted weekly report";
  }

  // Tasks
  if (table_name === "task_progress") {
    const oldStatus = old_data?.status;
    const newStatus = new_data?.status;

    if (action === "INSERT") return "started task";
    if (newStatus === "completed") return "completed task";
    if (newStatus === "approved") return "task was approved";
    if (newStatus === "rejected") return "task was rejected";
  }

  return null;
}

/**
 * Format audit log for display
 */
export function formatAuditLog(log: AuditLog): FormattedAuditLog {
  const tableName = getTableDisplayName(log.table_name);
  const specificDesc = getSpecificDescription(log);

  // Build title
  let title = "";
  if (log.action === "INSERT") {
    title = specificDesc || `Created ${tableName}`;
  } else if (log.action === "UPDATE") {
    title = specificDesc || `Updated ${tableName}`;
  } else if (log.action === "DELETE") {
    title = `Deleted ${tableName}`;
  }

  // Build description based on changed fields
  let description = "";
  if (log.changed_fields && log.changed_fields.length > 0) {
    const fieldNames = log.changed_fields
      .map((f) => getFieldDisplayName(f))
      .join(", ");
    description = `Changed: ${fieldNames}`;
  }

  // Get icon
  const icon =
    log.action === "INSERT"
      ? "➕"
      : log.action === "UPDATE"
      ? "✏️"
      : log.action === "DELETE"
      ? "🗑️"
      : "📝";

  // Build changes array
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  if (log.changed_fields && log.old_data && log.new_data) {
    for (const field of log.changed_fields) {
      changes.push({
        field: getFieldDisplayName(field),
        oldValue: formatValue(log.old_data[field]),
        newValue: formatValue(log.new_data[field]),
      });
    }
  }

  return {
    title,
    description,
    icon,
    changes,
  };
}

/**
 * Get context-specific entity name from data
 */
export function getEntityName(log: AuditLog): string | null {
  const data = log.new_data || log.old_data;
  if (!data) return null;

  // Try common name fields
  if (data.name) return data.name;
  if (data.title) return data.title;
  if (data.email) return data.email;

  // For team invitations, try to get team or user info
  if (log.table_name === "team_invitations") {
    // These would need to be joined in the query
    return null;
  }

  return null;
}
