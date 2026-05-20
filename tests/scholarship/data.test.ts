/**
 * Integration tests for the scholarship data facade.
 *
 * Hits the real Supabase project (via service-role) to verify each RPC
 * round-trip:
 *   - submitForm → draft row + form_submitted + identity_started events
 *   - findByAuthToken / findById / findBySigningToken lookups
 *   - recordIdentity → identity_verified + event
 *   - identity mismatch rejection
 *   - cancel + reset_for_retry transitions
 *   - listAgreements + listEvents + listAwaitingSchool reads
 *
 * Test rows are tracked via TEST_PREFIX and cleaned up in afterEach.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cancel,
  findByAuthToken,
  findById,
  listAgreements,
  listAwaitingSchool,
  listEvents,
  recordIdentity,
  resetForRetry,
  submitForm,
} from "@/lib/scholarship/data";

const adminClient = createAdminClient();
const createdIds: string[] = [];

function randomAuthToken(): string {
  return `test_${randomBytes(16).toString("hex")}`;
}

function randomPersonalCode(): string {
  // Format: NNNNNN-NNNNN (matches Latvian eID format)
  const head = String(100000 + Math.floor(Math.random() * 899999));
  const tail = String(10000 + Math.floor(Math.random() * 89999));
  return `${head}-${tail}`;
}

async function createTestDraft() {
  const authToken = randomAuthToken();
  const row = await submitForm({
    agreement_type: "partial",
    email: `test_data_${Date.now()}@test.local`,
    phone: "+371 20000000",
    address: "Test address 1, Rīga",
    language: "en",
    dokobit_auth_token: authToken,
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  });
  createdIds.push(row.id);
  return { row, authToken };
}

afterEach(async () => {
  if (createdIds.length === 0) return;
  // Event rows cascade on delete.
  await adminClient
    .from("scholarship_agreements")
    .delete()
    .in("id", createdIds);
  createdIds.length = 0;
});

describe("scholarship/data — submitForm + findByAuthToken", () => {
  it("creates a draft row and emits form_submitted + identity_started events", async () => {
    const { row, authToken } = await createTestDraft();

    expect(row.status).toBe("draft");
    expect(row.dokobit_auth_token).toBe(authToken);
    expect(row.signer_personal_code).toBeNull();

    const fetched = await findByAuthToken(authToken);
    expect(fetched.id).toBe(row.id);

    const events = await listEvents(row.id);
    expect(events.length).toBeGreaterThanOrEqual(2);
    const eventTypes = events.map((e) => e.event_type);
    expect(eventTypes).toContain("form_submitted");
    expect(eventTypes).toContain("identity_started");
  });

  it("throws when no row matches the auth token", async () => {
    await expect(findByAuthToken("test_nonexistent_token")).rejects.toThrow(
      "scholarship_not_found"
    );
  });
});

describe("scholarship/data — recordIdentity", () => {
  it("locks identity and advances status to identity_verified", async () => {
    const { authToken } = await createTestDraft();
    const personalCode = randomPersonalCode();

    const updated = await recordIdentity({
      dokobit_auth_token: authToken,
      personal_code: personalCode,
      country_code: "LV",
      name: "Test",
      surname: "Student",
    });

    expect(updated.status).toBe("identity_verified");
    expect(updated.signer_personal_code).toBe(personalCode);
    expect(updated.signer_name).toBe("Test");
    expect(updated.identity_verified_at).not.toBeNull();
  });

  it("rejects a mismatched personal_code on re-identify (caller logs)", async () => {
    // Note: the RPC's INSERT of identity_mismatch event is rolled back by
    // the RAISE EXCEPTION in the same transaction (Postgres semantics).
    // The complete-identity helper catches the error and logs the mismatch
    // via a separate recordEvent('error', ...) call so the audit trail is
    // preserved end-to-end. This test only verifies the rejection itself.
    const { authToken } = await createTestDraft();

    await recordIdentity({
      dokobit_auth_token: authToken,
      personal_code: randomPersonalCode(),
      country_code: "LV",
      name: "Test",
      surname: "Student",
    });

    await expect(
      recordIdentity({
        dokobit_auth_token: authToken,
        personal_code: randomPersonalCode(),
        country_code: "LV",
        name: "Other",
        surname: "Person",
      })
    ).rejects.toThrow("scholarship_identity_mismatch");
  });
});

describe("scholarship/data — read paths", () => {
  it("findById returns the row", async () => {
    const { row } = await createTestDraft();
    const fetched = await findById(row.id);
    expect(fetched.id).toBe(row.id);
  });

  it("listAgreements filters by status + agreement_type", async () => {
    const { row } = await createTestDraft();

    const drafts = await listAgreements({ status: "draft" });
    expect(drafts.some((r) => r.id === row.id)).toBe(true);

    const partial = await listAgreements({ agreement_type: "partial" });
    expect(partial.some((r) => r.id === row.id)).toBe(true);

    const full = await listAgreements({ agreement_type: "full" });
    expect(full.some((r) => r.id === row.id)).toBe(false);
  });

  it("listAgreements search matches recipient_email substring", async () => {
    const { row } = await createTestDraft();
    const hits = await listAgreements({ search: "test_data_" });
    expect(hits.some((r) => r.id === row.id)).toBe(true);
  });

  it("listAwaitingSchool excludes drafts", async () => {
    const { row } = await createTestDraft();
    const queue = await listAwaitingSchool();
    expect(queue.every((r) => r.status === "student_signed")).toBe(true);
    expect(queue.some((r) => r.id === row.id)).toBe(false);
  });
});

describe("scholarship/data — admin actions", () => {
  it("cancel transitions to cancelled with the provided reason", async () => {
    const { row } = await createTestDraft();
    const cancelled = await cancel(row.id, "test cancellation");

    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.status_reason).toBe("test cancellation");

    const events = await listEvents(row.id);
    expect(events.map((e) => e.event_type)).toContain("cancelled");
  });

  it("resetForRetry rejects draft rows that have no identity_verified_at", async () => {
    const { row } = await createTestDraft();
    await expect(resetForRetry(row.id)).rejects.toThrow();
  });
});
