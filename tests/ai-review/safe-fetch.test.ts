import { describe, expect, it } from "vitest";
import {
  assertPublicHttpUrl,
  isBlockedAddress,
} from "@/lib/ai-review/evidence/safe-fetch";

describe("isBlockedAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "100.64.0.1",
    "100.127.255.255",
    "192.0.0.1",
    "::",
    "::1",
    "fc00::1",
    "fe80::1",
    "::ffff:127.0.0.1",
  ])("blocks %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  it.each([
    "8.8.8.8",
    "1.1.1.1",
    "2606:4700::1111",
    "172.32.0.1",
    "100.63.255.255",
    "192.0.1.1",
  ])("allows %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("assertPublicHttpUrl", () => {
  it("rejects non-http(s) schemes without DNS", async () => {
    await expect(assertPublicHttpUrl("ftp://x")).rejects.toThrow("bad_scheme");
  });

  it("rejects localhost without DNS", async () => {
    await expect(assertPublicHttpUrl("http://localhost/x")).rejects.toThrow(
      "blocked_host"
    );
  });

  it("rejects IPv4 loopback literal without DNS", async () => {
    await expect(assertPublicHttpUrl("http://127.0.0.1/x")).rejects.toThrow(
      "blocked_host"
    );
  });

  it("rejects IPv6 loopback literal without DNS", async () => {
    await expect(assertPublicHttpUrl("http://[::1]/x")).rejects.toThrow(
      "blocked_host"
    );
  });
});
