import mammoth from "mammoth";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { EvidenceItem, NormalizedFile } from "../types";

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

export function classifyFile(name: string, mime: string | null): FileClass {
  const ext = (name.split(".").pop() || "").toLowerCase();
  const m = (mime || "").toLowerCase();
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

async function download(
  url: string,
  maxBytes: number,
  timeoutMs: number
): Promise<Buffer> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const len = Number(res.headers.get("content-length") || 0);
    if (len > maxBytes) throw new Error("too_large");
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new Error("too_large");
    return buf;
  } finally {
    clearTimeout(timer);
  }
}

async function pptxText(buf: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buf);
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const out: string[] = [];
  for (const [i, name] of slides.entries()) {
    const xml = await zip.file(name)!.async("string");
    const text = [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
      .map((m) => m[1])
      .join(" ");
    out.push(`--- slide ${i + 1} ---\n${text}`);
  }
  return out.join("\n");
}

async function xlsxText(buf: Buffer, maxRows = 60): Promise<string> {
  const wb = new ExcelJS.Workbook();
  // exceljs's own .d.ts shadows the global `Buffer` name with a local
  // `interface Buffer extends ArrayBuffer {}`, so its `load()` signature
  // does not accept Node's real Buffer type-wise (it works fine at runtime).
  // Cast via the inferred parameter type rather than a hardcoded ArrayBuffer
  // cast so this stays correct if exceljs's types change.
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const out: string[] = [];
  wb.eachSheet((ws) => {
    out.push(`--- sheet ${ws.name} (${ws.rowCount} rows) ---`);
    ws.eachRow((row, n) => {
      if (n > maxRows) return;
      out.push(
        (row.values as unknown[])
          .slice(1)
          .map((v) => (v == null ? "" : String(v)))
          .join(" | ")
      );
    });
  });
  return out.join("\n");
}

export async function loadFileEvidence(
  file: NormalizedFile,
  id: string,
  limits: { maxBytes: number; maxChars: number; timeoutMs: number }
): Promise<EvidenceItem> {
  const base = { id, source: "file" as const, url: file.url, label: file.name };
  const cls = classifyFile(file.name, file.type);
  if (cls === "image") return { ...base, kind: "image", imageUrl: file.url };
  if (cls === "video")
    return {
      ...base,
      kind: "unsupported",
      note: "Video cannot be reviewed. Ask the student for screenshots of the key moments.",
    };
  if (cls === "unsupported")
    return {
      ...base,
      kind: "unsupported",
      note: `File type not readable (${file.type ?? file.name}). Ask for PDF, DOCX, XLSX, PPTX, PNG or JPG.`,
    };
  try {
    const buf = await download(file.url, limits.maxBytes, limits.timeoutMs);
    if (cls === "pdf")
      return {
        ...base,
        kind: "pdf",
        pdfBase64: buf.toString("base64"),
        pdfFilename: file.name,
        bytes: buf.byteLength,
      };
    let text = "";
    if (cls === "docx")
      text = (await mammoth.extractRawText({ buffer: buf })).value;
    else if (cls === "xlsx") text = await xlsxText(buf);
    else if (cls === "pptx") text = await pptxText(buf);
    else text = buf.toString("utf8");
    text = text.replace(/\r/g, "").trim();
    if (!text)
      return {
        ...base,
        kind: "unreachable",
        note: "File downloaded but contained no readable text.",
      };
    return {
      ...base,
      kind: "text",
      text: text.slice(0, limits.maxChars),
      chars: text.length,
      bytes: buf.byteLength,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg === "too_large")
      return {
        ...base,
        kind: "too_large",
        note: `File is larger than the ${Math.round(limits.maxBytes / 1e6)} MB limit.`,
      };
    return {
      ...base,
      kind: "unreachable",
      note: `Could not download the file (${msg}).`,
    };
  }
}
