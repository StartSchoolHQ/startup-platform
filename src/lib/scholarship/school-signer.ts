/**
 * School (StartSchool) countersigner identity, sourced from environment.
 *
 * These four values identify the board member who countersigns every
 * scholarship contract with their eID (e.g. Anna Andersone). They are read
 * server-side only and MUST be set in the deploy environment.
 *
 * The contract is now created with the school as a co-signer UP FRONT (see
 * complete-identity.ts), so a missing value fails contract creation loudly
 * rather than silently producing a single-signer document that seals the
 * moment the student signs.
 */
import type { DokobitSigner } from "@/lib/dokobit/signing";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`School signer misconfigured: ${name} is not set`);
  }
  return value;
}

/**
 * The school signer's identity fields. `id` is intentionally omitted — the
 * caller assigns a per-agreement signer id (e.g. `school-<agreementId>`) so
 * the create-signing response can be correlated back to this signer.
 */
export function schoolSignerConfig(): Omit<DokobitSigner, "id"> {
  return {
    name: requiredEnv("SCHOOL_SIGNER_NAME"),
    surname: requiredEnv("SCHOOL_SIGNER_SURNAME"),
    code: requiredEnv("SCHOOL_SIGNER_PERSONAL_CODE"),
    country_code: requiredEnv("SCHOOL_SIGNER_COUNTRY_CODE"),
  };
}
