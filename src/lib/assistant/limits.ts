/**
 * The daily message limit resets at 00:00 UTC — the same window the
 * `assistant_send_message_v1` RPC counts against. Pure helpers, safe on the
 * client.
 */
export function nextUtcMidnight(now: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0,
      0
    )
  );
}

/** "00:00 UTC (03:00 your time)" — the local part is omitted when it matches. */
export function formatResetTime(
  resetsAt: Date,
  timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone
): string {
  const utc = "00:00 UTC";
  const local = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(resetsAt);
  return local === "00:00" ? utc : `${utc} (${local} your time)`;
}
