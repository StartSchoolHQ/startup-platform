import type {
  AiReviewSettings,
  EvidenceItem,
  EvidenceManifestEntry,
  NormalizedSubmission,
} from "../types";
import { loadFileEvidence } from "./files";
import { classifyLink, fetchLinkAsText } from "./links";

export interface EvidenceBundle {
  items: EvidenceItem[];
  manifest: EvidenceManifestEntry[];
}

const MAX_ITEMS = 12;
const MAX_TEXT_CHARS = 30_000;
const TIMEOUT_MS = 10_000;

function toManifest(item: EvidenceItem): EvidenceManifestEntry {
  return {
    id: item.id,
    source: item.source,
    url: item.url,
    label: item.label,
    status: item.kind,
    chars: item.chars,
    bytes: item.bytes,
    note: item.note,
  };
}

export async function buildEvidence(
  snapshot: NormalizedSubmission,
  settings: AiReviewSettings,
  onStage?: (stage: "reading_files" | "checking_links") => Promise<void>
): Promise<EvidenceBundle> {
  const items: EvidenceItem[] = [];
  const maxBytes = settings.maxFileMb * 1_000_000;

  items.push({
    id: "description",
    kind: "text",
    source: "description",
    url: null,
    label: "Student description (a claim, not proof)",
    text: snapshot.description || "(empty)",
    chars: snapshot.description.length,
  });

  // storage URLs pasted as links are files
  const files = [...snapshot.files];
  const links = snapshot.links.filter((l) => {
    if (classifyLink(l.url) !== "storage_file") return true;
    files.push({
      url: l.url,
      name: l.url.split("/").pop() || "file",
      size: null,
      type: null,
    });
    return false;
  });

  const budget = () => items.length < MAX_ITEMS + 1;

  await onStage?.("reading_files");
  for (const [i, f] of files.entries()) {
    if (!budget()) {
      items.push({
        id: `file-${i + 1}`,
        kind: "too_large",
        source: "file",
        url: f.url,
        label: f.name,
        note: "Skipped: more than 12 evidence items.",
      });
      continue;
    }
    items.push(
      await loadFileEvidence(f, `file-${i + 1}`, {
        maxBytes,
        maxChars: MAX_TEXT_CHARS,
        timeoutMs: TIMEOUT_MS,
      })
    );
  }

  await onStage?.("checking_links");
  for (const [i, l] of links.entries()) {
    const id = `link-${i + 1}`;
    const label = l.title || l.url;
    if (!budget()) {
      items.push({
        id,
        kind: "too_large",
        source: "link",
        url: l.url,
        label,
        note: "Skipped: more than 12 evidence items.",
      });
      continue;
    }
    if (classifyLink(l.url) === "search_results") {
      items.push({
        id,
        kind: "unverifiable",
        source: "link",
        url: l.url,
        label,
        note: "A search-results URL is not evidence: results differ per user and time. Ask for a dated screenshot instead.",
      });
      continue;
    }
    const r = await fetchLinkAsText(l.url, {
      timeoutMs: TIMEOUT_MS,
      maxChars: MAX_TEXT_CHARS,
    });
    items.push(
      r.ok
        ? {
            id,
            kind: "text",
            source: "link",
            url: l.url,
            label,
            text: r.text,
            chars: r.text.length,
          }
        : {
            id,
            kind: "unreachable",
            source: "link",
            url: l.url,
            label,
            note: `Could not read this page (${r.reason}). It may be private, require login, or render only with JavaScript. Ask the student to make it public or attach a PDF/screenshots.`,
          }
    );
  }

  return { items, manifest: items.map(toManifest) };
}
