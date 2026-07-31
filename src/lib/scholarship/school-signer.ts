/**
 * School (StartSchool) countersigner identities, sourced from environment.
 *
 * Two signer groups exist, selected by agreement type:
 *   - "board"     — full/partial/part_time contracts, countersigned by the
 *                   board member (SCHOOL_SIGNER_* env vars, e.g. Anna
 *                   Andersone).
 *   - "equipment" — laptop/keycard agreements, countersigned by the campus
 *                   manager (EQUIPMENT_SIGNER_* env vars). Matches the
 *                   "represented by its Campus Manager" wording in the
 *                   equipment contract templates.
 *
 * Values are read server-side only and MUST be set in the deploy
 * environment. The contract is created with the school as a co-signer UP
 * FRONT (see complete-identity.ts), so a missing value fails contract
 * creation loudly rather than silently producing a single-signer document
 * that seals the moment the student signs.
 */
import type { DokobitSigner } from "@/lib/dokobit/signing";
import type { Database } from "@/types/database";

type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

export type SignerGroup = "board" | "equipment";

/**
 * Which school identity countersigns a given agreement type. Also used by
 * the batch-sign route: Dokobit rejects a batch whose signer tokens belong
 * to different users, so a batch must never mix signer groups.
 */
export function signerGroupFor(type: AgreementType): SignerGroup {
  return type === "laptop" || type === "keycard" ? "equipment" : "board";
}

const ENV_PREFIX: Record<SignerGroup, string> = {
  board: "SCHOOL_SIGNER",
  equipment: "EQUIPMENT_SIGNER",
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`School signer misconfigured: ${name} is not set`);
  }
  return value;
}

/**
 * The school signer's identity fields for the given agreement type. `id` is
 * intentionally omitted — the caller derives a STABLE per-person signer id
 * (from country code + personal code) so Dokobit batch signing can relate
 * all of one person's signer tokens to the same user.
 */
export function schoolSignerConfig(
  type: AgreementType
): Omit<DokobitSigner, "id"> {
  const prefix = ENV_PREFIX[signerGroupFor(type)];
  return {
    name: requiredEnv(`${prefix}_NAME`),
    surname: requiredEnv(`${prefix}_SURNAME`),
    code: requiredEnv(`${prefix}_PERSONAL_CODE`),
    country_code: requiredEnv(`${prefix}_COUNTRY_CODE`),
  };
}
