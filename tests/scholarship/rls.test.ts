/**
 * RLS deny-all verification.
 *
 * Hits the real Supabase project using the public anon key and asserts
 * that the scholarship tables are completely opaque to the anon role:
 *   - SELECT returns zero rows (no leaks)
 *   - INSERT errors out (no spam via the public client)
 *
 * The admin SELECT policy is conditioned on `users.primary_role = 'admin'`
 * — anon users hit the policy's `using` clause and are excluded, so they
 * see no rows even though a policy exists.
 *
 * Writes always go through SECURITY DEFINER RPCs (verified in data.test.ts).
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "RLS test requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

const supabase = createClient<Database>(url, anon, {
  auth: { persistSession: false },
});

describe("scholarship RLS — anon role", () => {
  it("anon cannot select scholarship_agreements (zero rows returned)", async () => {
    const { data, error } = await supabase
      .from("scholarship_agreements")
      .select("id")
      .limit(1);
    // Either a hard RLS error or an empty result set is acceptable —
    // both mean the row is invisible.
    expect((data ?? []).length).toBe(0);
    if (error) {
      expect(error.message.toLowerCase()).toMatch(
        /permission|policy|not allowed|rls/
      );
    }
  });

  it("anon cannot select scholarship_agreement_events (zero rows returned)", async () => {
    const { data } = await supabase
      .from("scholarship_agreement_events")
      .select("id")
      .limit(1);
    expect((data ?? []).length).toBe(0);
  });

  it("anon cannot insert into scholarship_agreements", async () => {
    const { error } = await supabase.from("scholarship_agreements").insert({
      agreement_type: "full",
      recipient_email: "test_rls_anon@test.local",
      recipient_phone: "+371 20000000",
      recipient_address: "Test address",
      language: "en",
      expires_at: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(error).not.toBeNull();
  });

  it("anon cannot insert into scholarship_agreement_events", async () => {
    // Need a valid agreement_id shape; anon shouldn't get past the policy
    // either way. Using a deterministic UUID; doesn't matter if it exists.
    const { error } = await supabase
      .from("scholarship_agreement_events")
      .insert({
        agreement_id: "00000000-0000-0000-0000-000000000000",
        event_type: "form_submitted",
      });
    expect(error).not.toBeNull();
  });
});
