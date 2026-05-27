/**
 * Filename builder for agreement PDFs and signed `.edoc` files.
 *
 * Naming convention: `{Firstname}_{Lastname}_Startschool_Agreement.{ext}`
 * Example: `Jānis_Bērziņš_Startschool_Agreement.edoc`
 *
 * Both full and partial scholarship agreements get the same filename
 * since the agreement type is visible inside the document and not
 * something the recipient typically needs to disambiguate from the
 * filename alone.
 *
 * The signer's first and last name come from Dokobit eID and may contain
 * Latvian diacritics — we keep them: Dokobit, modern email clients, and
 * macOS/Windows file dialogs all handle UTF-8 filenames fine, and
 * preserving diacritics keeps the contract's display name legally
 * consistent with the signer's identity on the contract body.
 *
 * Only characters that are illegal in common file systems
 * (slashes, colons, asterisks, etc.) and control chars are stripped.
 */
import type { Database } from "@/types/database";

type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

const DOC_LABEL = "Startschool_Agreement";

/**
 * Strips characters that file systems / HTTP headers don't accept, then
 * collapses internal whitespace to single underscores. Preserves Unicode
 * letters incl. Latvian diacritics.
 */
function safe(part: string): string {
  return part
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

export interface AgreementFilenameInput {
  name: string;
  surname: string;
  /**
   * Retained on the interface for callers that still pass it (e.g. the
   * disabled n8n email path). The current naming convention is the same
   * for every agreement type, so the value is intentionally ignored.
   */
  agreement_type?: AgreementType;
  ext: "pdf" | "edoc";
}

export function buildAgreementFilename(input: AgreementFilenameInput): string {
  const first = safe(input.name);
  const last = safe(input.surname);
  return `${first}_${last}_${DOC_LABEL}.${input.ext}`;
}
