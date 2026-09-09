import { promises as dns } from "dns";
import net from "net";

// SSRF guard: only public http(s) hosts may be fetched. Blocks loopback,
// private (RFC1918), link-local, and metadata-service address ranges for
// both the literal hostname (IP-literal URLs) and every address a hostname
// resolves to (DNS rebinding-safe), plus every redirect hop.

function parseIPv4(ip: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return null;
  return parts;
}

function isBlockedIPv4(parts: number[]): boolean {
  const [a, b, c] = parts;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64/10 carrier-grade NAT
  if (a === 127) return true; // 127/8 loopback
  if (a === 169 && b === 254) return true; // 169.254/16 link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0/24 IETF protocol assignments
  if (a === 192 && b === 168) return true; // 192.168/16
  return false;
}

function expandIPv6(ip: string): number[] | null {
  let addr = ip;
  const v4Tail = /(?:^|:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(addr);
  if (v4Tail) {
    const v4 = parseIPv4(v4Tail[1]);
    if (!v4) return null;
    const hex1 = ((v4[0] << 8) | v4[1]).toString(16);
    const hex2 = ((v4[2] << 8) | v4[3]).toString(16);
    addr = `${addr.slice(0, addr.length - v4Tail[1].length)}${hex1}:${hex2}`;
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  if (halves.length === 1) {
    const groups = addr.split(":");
    if (groups.length !== 8 || groups.some((g) => g === "")) return null;
    const nums = groups.map((g) => parseInt(g, 16));
    return nums.some(Number.isNaN) ? null : nums;
  }
  const head = halves[0] ? halves[0].split(":").filter(Boolean) : [];
  const tail = halves[1] ? halves[1].split(":").filter(Boolean) : [];
  const missing = 8 - head.length - tail.length;
  if (missing < 0) return null;
  const groups = [...head, ...Array(missing).fill("0"), ...tail];
  if (groups.length !== 8) return null;
  const nums = groups.map((g) => parseInt(g, 16));
  return nums.some(Number.isNaN) ? null : nums;
}

function isBlockedIPv6(ip: string): boolean {
  const groups = expandIPv6(ip);
  if (!groups) return false;
  // IPv4-mapped ::ffff:a.b.c.d
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) {
    const a = (groups[6] >> 8) & 0xff;
    const b = groups[6] & 0xff;
    const c = (groups[7] >> 8) & 0xff;
    const d = groups[7] & 0xff;
    return isBlockedIPv4([a, b, c, d]);
  }
  // :: unspecified (all-zero)
  if (groups.every((g) => g === 0)) return true;
  // ::1 loopback
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true;
  // fc00::/7 (unique local)
  if (groups[0] >> 9 === 0b1111110) return true;
  // fe80::/10 (link-local)
  if (groups[0] >> 6 === 0b1111111010) return true;
  return false;
}

export function isBlockedAddress(ip: string): boolean {
  const v4 = parseIPv4(ip);
  if (v4) return isBlockedIPv4(v4);
  if (ip.includes(":")) return isBlockedIPv6(ip);
  return false;
}

export async function assertPublicHttpUrl(url: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("bad_scheme");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("bad_scheme");
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  if (hostname.toLowerCase() === "localhost") {
    throw new Error("blocked_host");
  }
  if (net.isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new Error("blocked_host");
    return parsed;
  }
  const records = await dns.lookup(hostname, { all: true });
  for (const r of records) {
    if (isBlockedAddress(r.address)) throw new Error("blocked_host");
  }
  return parsed;
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export async function safeFetch(
  url: string,
  init: RequestInit & { timeoutMs: number; maxRedirects?: number }
): Promise<Response> {
  const { timeoutMs, maxRedirects = 3, ...fetchInit } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = url;
    for (let hop = 0; ; hop++) {
      const validated = await assertPublicHttpUrl(current);
      const res = await fetch(validated.toString(), {
        ...fetchInit,
        redirect: "manual",
        signal: controller.signal,
      });
      const location = REDIRECT_STATUSES.has(res.status)
        ? res.headers.get("location")
        : null;
      if (!location) return res;
      if (hop >= maxRedirects) throw new Error("too_many_redirects");
      current = new URL(location, validated).toString();
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function readBodyWithCap(
  res: Response,
  maxBytes: number
): Promise<Buffer> {
  if (!res.body) return Buffer.from(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) throw new Error("too_large");
        chunks.push(value);
      }
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c)));
}

/**
 * Host of our own Supabase project, the only host that may serve submission
 * files. A path-substring match alone lets
 * `https://evil.example/storage/v1/object/public/task-files/x.pdf` spoof a
 * trusted storage link, and an unset env var means no host qualifies.
 */
export function ourStorageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).host;
  } catch {
    return null;
  }
}

/** True only for URLs served by our own Supabase storage host. */
export function isOurStorageUrl(url: string): boolean {
  const host = ourStorageHost();
  if (!host) return false;
  try {
    return new URL(url).host === host;
  } catch {
    return false;
  }
}
