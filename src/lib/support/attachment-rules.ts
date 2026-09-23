/** Shared by the support form (client) and the ticket route (server). */
export const ALLOWED_FILE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "text/plain",
  "text/csv",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/x-log",
  "application/octet-stream", // .log files often arrive as this
];

export const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB, matches the bucket limit
export const MAX_FILES = 3;
export const SUPPORT_ATTACHMENTS_BUCKET = "support-attachments";

/** Letters, digits, dots and dashes only; everything else becomes "_". */
export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.-]/g, "_").slice(0, 120);
}

/** `<userId>/<ticketId>/<timestamp>-<file>` — the first folder is what the storage policy checks. */
export function attachmentPath(
  userId: string,
  ticketId: string,
  fileName: string
): string {
  return `${userId}/${ticketId}/${Date.now()}-${sanitizeFileName(fileName)}`;
}

/** "1.2 MB" above one megabyte, otherwise "340 KB". */
export function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}
