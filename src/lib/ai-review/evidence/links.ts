import { parse } from "node-html-parser";

export type LinkClass =
  | "storage_file"
  | "google_doc"
  | "google_sheet"
  | "google_slides"
  | "search_results"
  | "generic";

const GOOGLE_ID = /\/d\/([a-zA-Z0-9_-]+)/;

export function classifyLink(url: string): LinkClass {
  const u = url.toLowerCase();
  if (u.includes("/storage/v1/object/public/task-files/"))
    return "storage_file";
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

export async function fetchLinkAsText(
  url: string,
  opts: { timeoutMs: number; maxChars: number }
): Promise<
  { ok: true; text: string; finalUrl: string } | { ok: false; reason: string }
> {
  const target = toFetchableUrl(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(target, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "StartSchoolReviewer/1.0 (+https://startschool.org)",
        accept: "text/html,text/plain,text/csv,*/*",
      },
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const ctype = res.headers.get("content-type") ?? "";
    const raw = await res.text();
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
    return {
      ok: false,
      reason:
        e instanceof Error && e.name === "AbortError"
          ? "timeout"
          : "fetch_error",
    };
  } finally {
    clearTimeout(timer);
  }
}
