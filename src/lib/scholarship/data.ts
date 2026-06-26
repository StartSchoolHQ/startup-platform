/**
 * Scholarship-agreement data facade.
 *
 * Every WRITE goes through a `scholarship_*` RPC. Every READ uses the
 * admin client (service role) because:
 *   1. RLS denies all anon/authenticated INSERT/UPDATE/DELETE.
 *   2. Public API routes (e.g. start-identity callback) need to look up
 *      a draft by its dokobit_auth_token without any logged-in user.
 *   3. Admin routes need cross-user SELECT for the queue/list views.
 *
 * The seam-audit script blocks any code outside the scholarship module
 * from importing this file — see `scripts/seam-audit.mjs`.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type Row = Database["public"]["Tables"]["scholarship_agreements"]["Row"];
type EventRow =
  Database["public"]["Tables"]["scholarship_agreement_events"]["Row"];
type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];
type Language = Database["public"]["Enums"]["scholarship_agreement_language"];
type Status = Database["public"]["Enums"]["scholarship_agreement_status"];
type Json =
  Database["public"]["Tables"]["scholarship_agreement_events"]["Row"]["payload"];

function admin() {
  return createAdminClient();
}

// ============================================================
// Write — student form submission + identity
// ============================================================

export interface SubmitFormInput {
  agreement_type: AgreementType;
  email: string;
  phone: string;
  address: string;
  language: Language;
  dokobit_auth_token: string;
  expires_at: string;
}

/**
 * Creates a draft scholarship_agreements row. The Dokobit session token
 * becomes the row's correlation key through the identity callback —
 * callers MUST mint the Dokobit auth session BEFORE calling this and
 * pass the resulting session_token in as `dokobit_auth_token`.
 */
export async function submitForm(input: SubmitFormInput): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_submit_form", {
    p_type: input.agreement_type,
    p_email: input.email,
    p_phone: input.phone,
    p_address: input.address,
    p_language: input.language,
    p_dokobit_auth_token: input.dokobit_auth_token,
    p_expires_at: input.expires_at,
  });
  if (error) throw error;
  return data as Row;
}

export interface SubmitFormV3Input {
  agreement_type: AgreementType;
  email: string;
  phone: string;
  address: string;
  /** ISO YYYY-MM-DD. Required for part_time, omitted for full/partial. */
  birthdate?: string;
  language: Language;
  /**
   * OUR self-generated correlation key, embedded in the Dokobit return_url.
   * Dokobit's create-session token and the token it appends to the callback
   * differ, so we key the row by this instead — see complete-identity.ts.
   */
  callback_ref: string;
  expires_at: string;
}

/**
 * V3 of submitForm: same as v2 (draft keyed by our own `callback_ref` in
 * return_url; `dokobit_auth_token` stays null until the identity callback
 * persists Dokobit's RETURN_TOKEN) plus the optional part-time birthdate.
 * v2 is retained server-side for rollback.
 */
export async function submitFormV3(input: SubmitFormV3Input): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_submit_form_v3", {
    p_type: input.agreement_type,
    p_email: input.email,
    p_phone: input.phone,
    p_address: input.address,
    p_birthdate: input.birthdate ?? null,
    p_language: input.language,
    p_callback_ref: input.callback_ref,
    p_expires_at: input.expires_at,
  });
  if (error) throw error;
  return data as Row;
}

/**
 * Persists Dokobit's RETURN_TOKEN (the token appended to the callback URL,
 * distinct from the create-session token) onto the row. Called on the
 * identity callback before recordIdentity so the existing
 * dokobit_auth_token lookup resolves. Idempotent.
 */
export async function attachReturnToken(input: {
  id: string;
  return_token: string;
}): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_attach_return_token", {
    p_id: input.id,
    p_return_token: input.return_token,
  });
  if (error) throw error;
  return data as Row;
}

export interface RecordIdentityInput {
  dokobit_auth_token: string;
  personal_code: string;
  country_code: string;
  name: string;
  surname: string;
}

/**
 * Locks identity on the draft row keyed by `dokobit_auth_token`.
 * Throws `scholarship_identity_mismatch` if a different personal_code
 * tries to re-identify against the same draft.
 */
export async function recordIdentity(input: RecordIdentityInput): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_record_identity", {
    p_dokobit_auth_token: input.dokobit_auth_token,
    p_personal_code: input.personal_code,
    p_country_code: input.country_code,
    p_name: input.name,
    p_surname: input.surname,
  });
  if (error) throw error;
  return data as Row;
}

// ============================================================
// Write — signing lifecycle
// ============================================================

export interface RecordSigningSessionInput {
  id: string;
  signing_token: string;
  signer_token: string;
  unsigned_pdf_path: string;
}

export async function recordSigningSession(
  input: RecordSigningSessionInput
): Promise<Row> {
  const { data, error } = await admin().rpc(
    "scholarship_record_signing_session",
    {
      p_id: input.id,
      p_signing_token: input.signing_token,
      p_signer_token: input.signer_token,
      p_unsigned_pdf_path: input.unsigned_pdf_path,
    }
  );
  if (error) throw error;
  return data as Row;
}

export interface RecordSigningSessionV2Input {
  id: string;
  signing_token: string;
  signer_token: string;
  school_signer_token: string;
  unsigned_pdf_path: string;
}

/**
 * V2 of recordSigningSession: persists the school countersigner's access
 * token alongside the student's at session-create time. Used by the
 * two-signer flow where the school is placed on the Dokobit document up
 * front (see complete-identity.ts), so the row already carries
 * dokobit_school_signer_token before the student signs — no later
 * addSigner step. V1 is kept for rollback.
 */
export async function recordSigningSessionV2(
  input: RecordSigningSessionV2Input
): Promise<Row> {
  const { data, error } = await admin().rpc(
    "scholarship_record_signing_session_v2",
    {
      p_id: input.id,
      p_signing_token: input.signing_token,
      p_signer_token: input.signer_token,
      p_school_signer_token: input.school_signer_token,
      p_unsigned_pdf_path: input.unsigned_pdf_path,
    }
  );
  if (error) throw error;
  return data as Row;
}

export async function recordStudentSigned(signingToken: string): Promise<Row> {
  const { data, error } = await admin().rpc(
    "scholarship_record_signer_signed",
    { p_signing_token: signingToken }
  );
  if (error) throw error;
  return data as Row;
}

export async function recordSchoolSigner(input: {
  id: string;
  school_signer_token: string;
}): Promise<Row> {
  const { data, error } = await admin().rpc(
    "scholarship_record_school_signer",
    {
      p_id: input.id,
      p_school_signer_token: input.school_signer_token,
    }
  );
  if (error) throw error;
  return data as Row;
}

/**
 * Attaches a Dokobit batch_token to N student-signed agreements at once.
 * Returns the number of rows successfully transitioned.
 */
export async function attachBatch(
  ids: string[],
  batchToken: string
): Promise<number> {
  const { data, error } = await admin().rpc("scholarship_attach_batch", {
    p_ids: ids,
    p_batch_token: batchToken,
  });
  if (error) throw error;
  return data as number;
}

export async function recordSchoolSigned(signingToken: string): Promise<Row> {
  const { data, error } = await admin().rpc(
    "scholarship_record_school_signed",
    { p_signing_token: signingToken }
  );
  if (error) throw error;
  return data as Row;
}

export async function recordArchived(input: {
  id: string;
  signed_doc_path: string;
}): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_record_archived", {
    p_id: input.id,
    p_signed_doc_path: input.signed_doc_path,
  });
  if (error) throw error;
  return data as Row;
}

const STORAGE_BUCKET = "scholarship-documents";

/**
 * Post-archive data minimization.
 *
 * Call AFTER `recordArchived` AND AFTER the completion email has been
 * sent — the email needs the unredacted recipient_email and signer_name.
 *
 * Two steps, in order:
 *   1. Delete the unsigned PDF from the storage bucket. The signed
 *      `.edoc` already lives at `signed_doc_path` and embeds the same
 *      data; the unsigned intermediate is no longer needed.
 *   2. Call the SECURITY DEFINER `scholarship_minimize_archived` RPC,
 *      which nulls out every PII field on the row and redacts every
 *      event payload for the agreement, then writes a `data_minimized`
 *      audit event.
 *
 * Storage delete is best-effort: if the file is already gone we move on.
 * The RPC is idempotent — re-running it on an already-minimized row is
 * a no-op.
 */
export async function minimizeArchived(input: {
  id: string;
  unsigned_pdf_path: string | null;
}): Promise<Row> {
  const client = admin();

  if (input.unsigned_pdf_path) {
    const { error: storageErr } = await client.storage
      .from(STORAGE_BUCKET)
      .remove([input.unsigned_pdf_path]);
    // 404-equivalents are expected on reruns; do not throw on storage
    // removal failures because the row-level minimization is still
    // safe to attempt.
    if (storageErr && !/not.?found/i.test(storageErr.message)) {
      throw storageErr;
    }
  }

  const { data, error } = await client.rpc("scholarship_minimize_archived", {
    p_id: input.id,
  });
  if (error) throw error;
  return data as Row;
}

// ============================================================
// Write — events, admin actions
// ============================================================

export type ManualEventType =
  | "identity_started"
  | "email_completed_sent"
  | "error";

/**
 * Logs a manual event to the append-only audit trail. State-changing
 * transitions already write their own events via the dedicated RPCs;
 * this is for side-channel observability (e.g. n8n delivery confirmation,
 * error during retry).
 */
export async function recordEvent(input: {
  id: string;
  event_type: ManualEventType;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await admin().rpc("scholarship_record_event", {
    p_id: input.id,
    p_event_type: input.event_type,
    p_payload: (input.payload ?? {}) as Json,
  });
  if (error) throw error;
}

export async function cancel(id: string, reason: string): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_cancel", {
    p_id: id,
    p_reason: reason,
  });
  if (error) throw error;
  return data as Row;
}

/**
 * Resets a stuck row back to identity_verified so the retry endpoint can
 * re-run PDF render + Dokobit signing/create. Only callable when the row
 * has an identity locked in (i.e. has at least made it past Dokobit eID).
 */
export async function resetForRetry(id: string): Promise<Row> {
  const { data, error } = await admin().rpc("scholarship_reset_for_retry", {
    p_id: id,
  });
  if (error) throw error;
  return data as Row;
}

// ============================================================
// Read paths
// ============================================================

export async function findById(id: string): Promise<Row> {
  const { data, error } = await admin()
    .from("scholarship_agreements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("scholarship_not_found");
  return data;
}

export async function findByAuthToken(dokobitAuthToken: string): Promise<Row> {
  const { data, error } = await admin()
    .from("scholarship_agreements")
    .select("*")
    .eq("dokobit_auth_token", dokobitAuthToken)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("scholarship_not_found");
  return data;
}

/**
 * Looks up the draft by OUR correlation key (embedded in the Dokobit
 * return_url). This is the identity-callback's row lookup — Dokobit's
 * appended token is a different value, so we can't find the row by it.
 */
export async function findByCallbackRef(callbackRef: string): Promise<Row> {
  const { data, error } = await admin()
    .from("scholarship_agreements")
    .select("*")
    .eq("callback_ref", callbackRef)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("scholarship_not_found");
  return data;
}

export async function findBySigningToken(signingToken: string): Promise<Row> {
  const { data, error } = await admin()
    .from("scholarship_agreements")
    .select("*")
    .eq("dokobit_signing_token", signingToken)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("scholarship_not_found");
  return data;
}

export interface ListAgreementsFilters {
  status?: Status;
  agreement_type?: AgreementType;
  search?: string;
}

export async function listAgreements(
  filters: ListAgreementsFilters = {}
): Promise<Row[]> {
  let query = admin()
    .from("scholarship_agreements")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.agreement_type) {
    query = query.eq("agreement_type", filters.agreement_type);
  }
  if (filters.search) {
    // PostgREST OR filter — escape commas/parentheses so a malicious
    // search string can't break out of the operator list.
    const sanitized = filters.search.replace(/[(),]/g, " ");
    const needle = `%${sanitized}%`;
    query = query.or(
      [
        `recipient_email.ilike.${needle}`,
        `signer_name.ilike.${needle}`,
        `signer_surname.ilike.${needle}`,
      ].join(",")
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Rows the admin can batch-countersign. The school is placed on the Dokobit
 * document as a co-signer at creation, so `dokobit_school_signer_token` is
 * already set; the student-signed webhook then promotes the row to
 * `awaiting_school_signature` — that's the state batch needs.
 *
 * Sorted oldest-first so the queue preserves order.
 */
export async function listAwaitingSchool(): Promise<Row[]> {
  const { data, error } = await admin()
    .from("scholarship_agreements")
    .select("*")
    .eq("status", "awaiting_school_signature")
    .order("student_signed_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listEvents(agreementId: string): Promise<EventRow[]> {
  const { data, error } = await admin()
    .from("scholarship_agreement_events")
    .select("*")
    .eq("agreement_id", agreementId)
    .order("occurred_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
