/** File-type classification for submission attachments. */
export type FileClass =
  | "image"
  | "pdf"
  | "docx"
  | "xlsx"
  | "pptx"
  | "csv"
  | "text"
  | "video"
  | "unsupported";

/**
 * SVG is markup, not a rendered picture: the model would read the source
 * instead of seeing the design, so it is never sent as an image.
 */
export function isSvgFile(name: string, mime: string | null): boolean {
  const ext = (name.split(".").pop() || "").toLowerCase();
  return ext === "svg" || (mime || "").toLowerCase() === "image/svg+xml";
}

export function classifyFile(name: string, mime: string | null): FileClass {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (isSvgFile(name, mime)) return "unsupported";
  if (
    ["png", "jpg", "jpeg", "webp", "gif"].includes(ext) ||
    m.startsWith("image/")
  ) {
    return ext === "heic" || m === "image/heic" ? "unsupported" : "image";
  }
  if (ext === "pdf" || m === "application/pdf") return "pdf";
  if (ext === "docx" || m.includes("wordprocessingml")) return "docx";
  if (ext === "xlsx" || m.includes("spreadsheetml")) return "xlsx";
  if (ext === "pptx" || m.includes("presentationml")) return "pptx";
  if (ext === "csv" || m === "text/csv") return "csv";
  if (
    ["txt", "md", "html", "htm", "json"].includes(ext) ||
    m.startsWith("text/")
  )
    return "text";
  if (
    ["mp4", "mov", "webm", "avi", "mkv"].includes(ext) ||
    m.startsWith("video/")
  )
    return "video";
  return "unsupported";
}
