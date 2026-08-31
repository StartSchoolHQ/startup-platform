/**
 * Integration tests for scholarship_set_outcome_v1 — the admin action that
 * marks a signed (archived) agreement as `dropped_out` / `terminated_by_school`
 * and can revert it back to `archived`.
 *
 * Hits the real Supabase project via service-role, same as data.test.ts.
 * Test rows use the test_data_%@test.local email pattern so the
 * cleanup_test_scholarship_agreements RPC removes them in afterEach.
 */
import { afterEach, describe, expect, it } from "vitest";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  listEvents,
  setOutcome,
  submitForm,
  type OutcomeStatus,
} from "@/lib/scholarship/data";

const adminClient = createAdminClient();
const createdIds: string[] = [];

function randomAuthToken(): string {
  return `test_${randomBytes(16).toString("hex")}`;
}

async function createTestDraft() {
  const row = await submitForm({
    agreement_type: "partial",
    email: `test_data_${Date.now()}_${randomBytes(4).toString("hex")}@test.local`,
    phone: "+371 20000000",
    address: "Test address 1, Rīga",
    language: "en",
    dokobit_auth_token: randomAuthToken(),
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  });
  createdIds.push(row.id);
  return row;
}

/** Draft promoted straight to archived, bypassing the signing workflow. */
async function createArchivedRow() {
  const draft = await createTestDraft();
  const { error } = await adminClient
    .from("scholarship_agreements")
    .update({
      status: "archived",
      signed_doc_path: `signed/${draft.id}.edoc`,
      archived_at: new Date().toISOString(),
    })
    .eq("id", draft.id);
  expect(error).toBeNull();
  return draft;
}

afterEach(async () => {
  if (createdIds.length === 0) return;
  const { data: deleted, error } = await adminClient.rpc(
    "cleanup_test_scholarship_agreements"
  );
  if (error) {
    throw new Error(`Test cleanup failed: ${error.message}`);
  }
  if ((deleted ?? 0) < createdIds.length) {
    throw new Error(
      `Test cleanup deleted ${deleted ?? 0} rows but ${createdIds.length} were created — test data may be left in the database`
    );
  }
  createdIds.length = 0;
});

describe("scholarship/data — setOutcome", () => {
  it("marks an archived row as dropped_out with reason + status_changed event", async () => {
    const row = await createArchivedRow();

    const updated = await setOutcome({
      id: row.id,
      status: "dropped_out",
      reason: "test: student dropped out",
    });

    expect(updated.status).toBe("dropped_out");
    expect(updated.status_reason).toBe("test: student dropped out");
    // The signed document must survive the outcome change.
    expect(updated.signed_doc_path).toBe(`signed/${row.id}.edoc`);

    const events = await listEvents(row.id);
    const change = events.find((e) => e.event_type === "status_changed");
    expect(change).toBeDefined();
    expect(change?.payload).toMatchObject({
      from: "archived",
      to: "dropped_out",
      reason: "test: student dropped out",
    });
  });

  it("marks an archived row as terminated_by_school", async () => {
    const row = await createArchivedRow();

    const updated = await setOutcome({
      id: row.id,
      status: "terminated_by_school",
      reason: "test: contract terminated by school",
    });

    expect(updated.status).toBe("terminated_by_school");
    expect(updated.status_reason).toBe("test: contract terminated by school");
  });

  it("reverts a terminated row back to archived and clears the reason", async () => {
    const row = await createArchivedRow();
    await setOutcome({
      id: row.id,
      status: "dropped_out",
      reason: "test: misclick",
    });

    const reverted = await setOutcome({
      id: row.id,
      status: "archived",
      reason: null,
    });

    expect(reverted.status).toBe("archived");
    expect(reverted.status_reason).toBeNull();

    const events = await listEvents(row.id);
    const changes = events.filter((e) => e.event_type === "status_changed");
    expect(changes.length).toBe(2);
  });

  it("rejects outcome changes on rows that are not archived", async () => {
    const draft = await createTestDraft();
    await expect(
      setOutcome({
        id: draft.id,
        status: "dropped_out",
        reason: "test: should fail",
      })
    ).rejects.toThrow(/scholarship_state_transition_denied/);
  });

  it("rejects target statuses outside the outcome set", async () => {
    const row = await createArchivedRow();
    await expect(
      setOutcome({
        id: row.id,
        // Cast past the TS guard on purpose — this verifies the DB-level
        // transition check, not the client-side type.
        status: "cancelled" as OutcomeStatus,
        reason: "test: not an outcome status",
      })
    ).rejects.toThrow(/scholarship_state_transition_denied/);
  });

  it("rejects reverting a plain archived row (no outcome to revert)", async () => {
    const row = await createArchivedRow();
    await expect(
      setOutcome({ id: row.id, status: "archived", reason: null })
    ).rejects.toThrow(/scholarship_state_transition_denied/);
  });
});
