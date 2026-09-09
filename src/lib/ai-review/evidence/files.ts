import mammoth from "mammoth";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import type { EvidenceItem, NormalizedFile } from "../types";
import { classifyFile, isSvgFile } from "./classify";
import { isOurStorageUrl, readBodyWithCap, safeFetch } from "./safe-fetch";

export type { FileClass } from "./classify";
export { classifyFile } from "./classify";

export interface FileLimits {
  /** Per-file byte cap (`max_file_mb`). */
  maxBytes: number;
  /** Bytes still available in the review's TOTAL download budget. */
  remainingBytes: number;
  maxChars: number;
  maxPdfPages: number;
  timeoutMs: number;
}

const NON_STORAGE_IMAGE_NOTE =
  "Image must be uploaded through the submission form (external image links are not reviewed).";
const NON_STORAGE_FILE_NOTE =
  "File must be uploaded through the submission form (external file links are not reviewed).";
const SVG_NOTE =
  "SVG files are not reviewed (they are markup, not a rendered picture). Export the design as PNG or JPG and upload that.";

const mb = (bytes: number) => Math.round(bytes / 1e6);
const totalBudgetNote = (limits: FileLimits) =>
  `Total attachment size exceeds the ${mb(limits.maxBytes)} MB review limit — remove or shrink files.`;

/**
 * Page count straight from the raw PDF bytes — no parser dependency.
 * `/Type /Page` (and not `/Pages`) appears once per page object; latin1
 * keeps every byte addressable as a character.
 */
export function countPdfPages(buf: Buffer): number {
  return (buf.toString("latin1").match(/\/Type\s*\/Page(?![s])/g) ?? []).length;
}

async function download(
  url: string,
  maxBytes: number,
  timeoutMs: number
): Promise<Buffer> {
  const res = await safeFetch(url, { timeoutMs, maxRedirects: 3 });
  if (!res.ok) throw new Error(`http_${res.status}`);
  // Early reject on the declared size before touching the body; the
  // absence (or dishonesty) of content-length is still bounded below by
  // readBodyWithCap streaming the body with a running byte counter.
  const len = Number(res.headers.get("content-length") || 0);
  if (len > maxBytes) throw new Error("too_large");
  return readBodyWithCap(res, maxBytes);
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
  limits: FileLimits
): Promise<EvidenceItem> {
  const base = { id, source: "file" as const, url: file.url, label: file.name };
  const cls = classifyFile(file.name, file.type);
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
      note: isSvgFile(file.name, file.type)
        ? SVG_NOTE
        : `File type not readable (${file.type ?? file.name}). Ask for PDF, DOCX, XLSX, PPTX, PNG or JPG.`,
    };
  // Submission files only ever come from uploadTaskFiles, i.e. our own
  // storage host. Anything else is a URL the student typed: we neither hand
  // it to the model as an image nor download it.
  if (!isOurStorageUrl(file.url))
    return {
      ...base,
      kind: "unverifiable",
      note: cls === "image" ? NON_STORAGE_IMAGE_NOTE : NON_STORAGE_FILE_NOTE,
    };
  if (cls === "image") return { ...base, kind: "image", imageUrl: file.url };

  const cap = Math.min(limits.maxBytes, limits.remainingBytes);
  if (cap <= 0)
    return { ...base, kind: "too_large", note: totalBudgetNote(limits) };
  try {
    const buf = await download(file.url, cap, limits.timeoutMs);
    if (cls === "pdf") {
      const pages = countPdfPages(buf);
      if (pages > limits.maxPdfPages)
        return {
          ...base,
          kind: "too_large",
          bytes: buf.byteLength,
          note: `PDF has ~${pages} pages; the reviewer reads at most ${limits.maxPdfPages}.`,
        };
      return {
        ...base,
        kind: "pdf",
        pdfBase64: buf.toString("base64"),
        pdfFilename: file.name,
        bytes: buf.byteLength,
      };
    }
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
        bytes: buf.byteLength,
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
        note:
          cap < limits.maxBytes
            ? totalBudgetNote(limits)
            : `File is larger than the ${mb(limits.maxBytes)} MB limit.`,
      };
    if (msg === "blocked_host" || msg === "bad_scheme")
      return {
        ...base,
        kind: "unreachable",
        note: "This address cannot be fetched by the reviewer. Use a public URL or attach the file.",
      };
    return {
      ...base,
      kind: "unreachable",
      note: `Could not download the file (${msg}).`,
    };
  }
}
