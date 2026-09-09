import type {
  NormalizedFile,
  NormalizedLink,
  NormalizedSubmission,
} from "./types";

const URLISH = /^(https?:\/\/|www\.)/i;

function asObject(raw: unknown): Record<string, unknown> | string | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      // A string that parses to something other than a plain object mirrors
      // the SQL helper's behaviour: discard it entirely (-> empty result).
      // Only a genuinely unparseable string falls through to the catch
      // branch and is kept as the description.
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return raw;
    }
  }
  if (typeof raw === "object" && !Array.isArray(raw))
    return raw as Record<string, unknown>;
  return null;
}

function fileName(url: string): string {
  return url.split("/").pop() || url;
}

export function normalizeSubmission(raw: unknown): NormalizedSubmission {
  const obj = asObject(raw);
  if (obj === null) return { description: "", links: [], files: [] };
  if (typeof obj === "string")
    return { description: obj, links: [], files: [] };

  const links: NormalizedLink[] = [];
  const seen = new Set<string>();
  // A non-empty explicit `url` is kept as-is (no URLISH check — mirrors SQL,
  // which trusts an explicit url field). URLISH only gates the fallback to
  // `title` when there is no explicit url.
  const pushLink = (url: string | undefined, title = "") => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ url, title });
  };
  if (Array.isArray(obj.external_urls)) {
    for (const item of obj.external_urls) {
      if (typeof item === "string") pushLink(item);
      else if (item && typeof item === "object") {
        const o = item as Record<string, unknown>;
        const url = typeof o.url === "string" && o.url ? o.url : undefined;
        const title = typeof o.title === "string" ? o.title : "";
        pushLink(url ?? (URLISH.test(title) ? title : undefined), title);
      }
    }
  }
  if (typeof obj.url === "string") pushLink(obj.url);

  const files: NormalizedFile[] = [];
  const rawFiles = [
    ...(Array.isArray(obj.files) ? obj.files : []),
    ...(Array.isArray(obj.screenshots) ? obj.screenshots : []),
  ];
  for (const item of rawFiles) {
    if (typeof item === "string" && item) {
      files.push({ url: item, name: fileName(item), size: null, type: null });
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if (typeof o.url !== "string" || !o.url) continue;
      files.push({
        url: o.url,
        name: typeof o.name === "string" ? o.name : fileName(o.url),
        size: typeof o.size === "number" ? o.size : null,
        type: typeof o.type === "string" ? o.type : null,
      });
    }
  }

  const description =
    (typeof obj.description === "string" && obj.description) ||
    (typeof obj.notes === "string" && obj.notes) ||
    "";
  return { description, links, files };
}
