import { parse } from "node-html-parser";
import { readBodyWithCap, safeFetch } from "./safe-fetch";

export type LinkClass =
  | "storage_file"
  | "google_doc"
  | "google_sheet"
  | "google_slides"
  | "search_results"
  | "generic";

const GOOGLE_ID = /\/d\/([a-zA-Z0-9_-]+)/;

// `storage_file` requires both the well-known path shape AND a host that
// matches our own Supabase project — a path-substring match alone lets
// `https://evil.example/storage/v1/object/public/task-files/x.pdf` spoof a
// trusted storage link (allowlist-semantic-escape). No env var configured
// means no host can ever qualify as storage_file.
function ourStorageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

export function classifyLink(url: string): LinkClass {
  const u = url.toLowerCase();
  if (u.includes("/storage/v1/object/public/task-files/")) {
    const storageHost = ourStorageHost();
    try {
      if (storageHost && new URL(url).host === storageHost) {
        return "storage_file";
      }
    } catch {
      // malformed URL — fall through to the other classifications below
    }
  }
  if (u.includes("docs.google.com/document/")) return "google_doc";
  if (u.includes("docs.google.com/spreadsheets/")) return "google_sheet";
  if (u.includes("docs.google.com/presentation/")) return "google_slides";
  if (/(google\.[a-z.]+\/search|duckduckgo\.com\/\?|bing\.com\/search)/.test(u))
    return "search_results";
  return "generic";
}

export function toFetchableUrl(url: string): string {
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const id = withScheme.match(GOOGLE_ID)?.[1];
  switch (classifyLink(withScheme)) {
    case "google_doc":
      return id
        ? `https://docs.google.com/document/d/${id}/export?format=txt`
        : withScheme;
    case "google_sheet":
      return id
        ? `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
        : withScheme;
    case "google_slides":
      return id
        ? `https://docs.google.com/presentation/d/${id}/export/txt`
        : withScheme;
    default:
      return withScheme;
  }
}

export function htmlToText(html: string): string {
  const root = parse(html);
  root
    .querySelectorAll("script, style, noscript, nav, footer, svg")
    .forEach((n) => n.remove());
  const title = root.querySelector("title")?.text.trim();
  const body =
    root.querySelector("body")?.structuredText ?? root.structuredText;
  const lines = `${title ? title + "\n" : ""}${body}`
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines.join("\n");
}

// Text pages are small; this is just a sanity cap against something
// pathological, the real char budget is opts.maxChars applied after decode.
const MAX_LINK_BYTES = 20_000_000;

export async function fetchLinkAsText(
  url: string,
  opts: { timeoutMs: number; maxChars: number }
): Promise<
  { ok: true; text: string; finalUrl: string } | { ok: false; reason: string }
> {
  const target = toFetchableUrl(url);
  try {
    const res = await safeFetch(target, {
      timeoutMs: opts.timeoutMs,
      maxRedirects: 3,
      headers: {
        "user-agent": "StartSchoolReviewer/1.0 (+https://startschool.org)",
        accept: "text/html,text/plain,text/csv,*/*",
      },
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const ctype = res.headers.get("content-type") ?? "";
    const buf = await readBodyWithCap(res, MAX_LINK_BYTES);
    const raw = buf.toString("utf8");
    const text = ctype.includes("html")
      ? htmlToText(raw)
      : raw.replace(/\r/g, "").trim();
    if (text.length < 200) return { ok: false, reason: "too_little_text" };
    return {
      ok: true,
      text: text.slice(0, opts.maxChars),
      finalUrl: res.url || target,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "blocked_host" || msg === "bad_scheme") {
      return { ok: false, reason: "blocked_host" };
    }
    if (msg === "too_large") return { ok: false, reason: "too_large" };
    if (msg === "too_many_redirects") {
      return { ok: false, reason: "too_many_redirects" };
    }
    return {
      ok: false,
      reason:
        e instanceof Error && e.name === "AbortError"
          ? "timeout"
          : "fetch_error",
    };
  }
}
