import { describe, it, expect, afterEach } from "vitest";
import { getAdminClient, TEST_EMAIL_DOMAIN, TEST_PREFIX } from "../setup";

/** Shape of the Supabase `before-user-created` hook payload (docs, 2026-09). */
function event(email: string, provider: string) {
  return {
    metadata: { name: "before-user-created" },
    user: {
      email,
      app_metadata: { provider, providers: [provider] },
      user_metadata: {},
    },
  };
}

describe("hook_restrict_signup", () => {
  it("allows google + @startschool.org", async () => {
    const { data, error } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("new.person@startschool.org", "google"),
    });
    expect(error).toBeNull();
    expect(data).toEqual({});
  });

  it("is case-insensitive on the domain", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("New.Person@StartSchool.ORG", "google"),
    });
    expect(data).toEqual({});
  });

  it("rejects google + other domain with 403", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("someone@gmail.com", "google"),
    });
    expect(data.error.http_code).toBe(403);
    expect(data.error.message).toMatch(/@startschool\.org/);
  });

  it("rejects email/password signups even for the domain", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("new.person@startschool.org", "email"),
    });
    expect(data.error.http_code).toBe(403);
  });

  it("rejects look-alike domains", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: event("x@startschool.org.evil.com", "google"),
    });
    expect(data.error.http_code).toBe(403);
  });

  it("rejects a missing email", async () => {
    const { data } = await getAdminClient().rpc("hook_restrict_signup", {
      event: { metadata: {}, user: { app_metadata: { provider: "google" } } },
    });
    expect(data.error.http_code).toBe(403);
  });
});

describe("handle_new_auth_user v2", () => {
  const created: string[] = [];

  const testEmail = (tag: string) =>
    `${TEST_PREFIX}${tag}_${Date.now()}${TEST_EMAIL_DOMAIN}`;

  afterEach(async () => {
    const sb = getAdminClient();
    for (const id of created) {
      const { error } = await sb.auth.admin.deleteUser(id);
      if (error) throw new Error(`cleanup deleteUser failed: ${error.message}`);
      // public.users.id has no FK to auth.users — remove the profile row too.
      const { error: pErr } = await sb.from("users").delete().eq("id", id);
      if (pErr) throw new Error(`cleanup users delete failed: ${pErr.message}`);
    }
    created.length = 0;
  });

  it("uses full_name for Google-shaped metadata", async () => {
    const sb = getAdminClient();
    const { data, error } = await sb.auth.admin.createUser({
      email: testEmail("g"),
      email_confirm: true,
      user_metadata: { full_name: "Google Person", name: "Google Person" },
    });
    expect(error).toBeNull();
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("name, avatar_url")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.name).toBe("Google Person");
    expect(profile?.avatar_url).toBeNull();
  });

  it("prefers first_name + last_name when present", async () => {
    const sb = getAdminClient();
    const { data } = await sb.auth.admin.createUser({
      email: testEmail("i"),
      email_confirm: true,
      user_metadata: { first_name: "Inv", last_name: "Ited", full_name: "X" },
    });
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("name")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.name).toBe("Inv Ited");
  });

  it("leaves name null when no metadata", async () => {
    const sb = getAdminClient();
    const { data } = await sb.auth.admin.createUser({
      email: testEmail("n"),
      email_confirm: true,
    });
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("name")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.name).toBeNull();
  });

  it("assigns the single open batch (NULL when 0 or >1 are open)", async () => {
    const sb = getAdminClient();
    const { data: open } = await sb
      .from("diploma_batches")
      .select("id")
      .is("closed_at", null);
    const expected = open?.length === 1 ? open[0].id : null;

    const { data } = await sb.auth.admin.createUser({
      email: testEmail("b"),
      email_confirm: true,
    });
    created.push(data.user!.id);
    const { data: profile } = await sb
      .from("users")
      .select("batch_id")
      .eq("id", data.user!.id)
      .single();
    expect(profile?.batch_id).toBe(expected);
  });
});
