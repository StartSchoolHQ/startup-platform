/**
 * Grant + shape check for get_user_profile_card_v1. Read-only: creates no
 * rows. Runs against the production project like the other RPC tests.
 */
import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const RANDOM_ID = "00000000-0000-4000-8000-000000000000";

describe("get_user_profile_card_v1", () => {
  it("is not executable without a session", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.rpc("get_user_profile_card_v1", {
      p_user_id: RANDOM_ID,
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("returns null for an unknown user", async () => {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.rpc("get_user_profile_card_v1", {
      p_user_id: RANDOM_ID,
    });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("returns the curated shape and never the email", async () => {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: users, error: usersErr } = await admin
      .from("users")
      .select("id")
      .eq("status", "active")
      .limit(1);
    if (usersErr) throw usersErr;
    if (!users?.length) return; // empty database — nothing to assert

    const { data, error } = await admin.rpc("get_user_profile_card_v1", {
      p_user_id: users[0].id,
    });
    expect(error).toBeNull();
    const card = data as Record<string, unknown>;
    expect(card.user_id).toBe(users[0].id);
    expect(Object.keys(card).sort()).toEqual(
      [
        "avatar_url",
        "founder_card",
        "member_since",
        "my_journey_credits",
        "my_journey_xp",
        "name",
        "team",
        "team_points",
        "team_xp",
        "user_id",
      ].sort()
    );
    expect(card).not.toHaveProperty("email");
  });
});

describe("get_user_profile_card_v2", () => {
  it("is not executable without a session", async () => {
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await anon.rpc("get_user_profile_card_v2", {
      p_user_id: RANDOM_ID,
    });
    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error!.message).toMatch(/permission denied/i);
  });

  it("returns null for an unknown user", async () => {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data, error } = await admin.rpc("get_user_profile_card_v2", {
      p_user_id: RANDOM_ID,
    });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("adds the two My Journey completion counts and nothing else", async () => {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
    const { data: users, error: usersErr } = await admin
      .from("users")
      .select("id")
      .eq("status", "active")
      .limit(1);
    if (usersErr) throw usersErr;
    if (!users?.length) return; // empty database — nothing to assert

    const { data, error } = await admin.rpc("get_user_profile_card_v2", {
      p_user_id: users[0].id,
    });
    expect(error).toBeNull();
    const card = data as Record<string, unknown>;
    expect(card.user_id).toBe(users[0].id);
    expect(card).not.toHaveProperty("email");
    expect(card).not.toHaveProperty("primary_role");
    expect(Object.keys(card).sort()).toEqual(
      [
        "avatar_url",
        "founder_card",
        "member_since",
        "my_journey_credits",
        "my_journey_tasks_completed",
        "my_journey_tasks_total",
        "my_journey_xp",
        "name",
        "team",
        "team_points",
        "team_xp",
        "user_id",
      ].sort()
    );
    const completed = card.my_journey_tasks_completed as number;
    const total = card.my_journey_tasks_total as number;
    expect(typeof completed).toBe("number");
    expect(typeof total).toBe("number");
    expect(completed).toBeGreaterThanOrEqual(0);
    expect(completed).toBeLessThanOrEqual(total);
  });
});
