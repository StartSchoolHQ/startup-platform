import { describe, expect, it } from "vitest";
import {
  CookieJar,
  fetchQwasarCsv,
  parseLoginForm,
  QwasarAuthError,
  QwasarImportError,
} from "@/lib/program-assistant/qwasar-client";

const CAS = "https://casapp.us.qwasar.io";
const APP = "https://upskill.us.qwasar.io";
const SERVICE = `${APP}/users/service`;

const CAS_HTML = `<!DOCTYPE html><html><head><title>Qwasar.io - Keep Growing</title></head><body>
<form id="login-form" action="/login" method="post">
  <input type="hidden" name="authenticity_token" value="tok&amp;en" />
  <input type="hidden" name="lt" value="LT-123-abc" />
  <input type="hidden" name="service" value="${SERVICE}" />
  <input type="text" name="username" />
  <input type="password" name="password" />
  <button type="submit">Log in</button>
</form></body></html>`;

const CSV =
  "User ID,Name,Login,Status,Email,Last Login,Cohort Name,Preseason Web\n1,A,a,active,a@x,,Triffid Nebula - Andromeda,10\n";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

/** Scripted CAS + app server. `badPassword` makes CAS re-render the form. */
function fakeServer(opts: { badPassword?: boolean } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((v, k) => {
      headers[k] = v;
    });
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers,
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    const res = (status: number, body = "", h: Record<string, string> = {}) =>
      new Response(body, { status, headers: h });

    if (url === `${APP}/users/sign_in`) {
      return res(302, "", {
        location: `${CAS}/login?service=${encodeURIComponent(SERVICE)}`,
      });
    }
    if (url.startsWith(`${CAS}/login?service=`)) {
      return res(200, CAS_HTML, {
        "content-type": "text/html",
        "set-cookie": "_appcas_session=cas1; path=/; HttpOnly",
      });
    }
    if (url === `${CAS}/login` && init?.method === "POST") {
      if (!headers.cookie?.includes("_appcas_session=cas1")) {
        return res(403, "no cas cookie");
      }
      if (opts.badPassword) return res(200, CAS_HTML);
      return res(302, "", { location: `${SERVICE}?ticket=ST-777` });
    }
    if (url === `${SERVICE}?ticket=ST-777`) {
      return res(302, "", {
        location: `${APP}/dashboard`,
        "set-cookie": "_upskill_session=app1; path=/; HttpOnly",
      });
    }
    if (url === `${APP}/dashboard`) return res(200, "<html>home</html>");
    if (url === `${APP}/admin/campuses/startschool/users/download_progress`) {
      if (!headers.cookie?.includes("_upskill_session=app1")) {
        return res(302, "", { location: `${APP}/users/sign_in` });
      }
      return res(200, CSV, { "content-type": "text/csv; charset=utf-8" });
    }
    return res(404, `unexpected ${url}`);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

describe("parseLoginForm", () => {
  it("extracts the hidden CAS fields and resolves the action", () => {
    const form = parseLoginForm(CAS_HTML, `${CAS}/login?service=x`);
    expect(form.action).toBe(`${CAS}/login`);
    expect(form.fields).toEqual({
      authenticity_token: "tok&en",
      lt: "LT-123-abc",
      service: SERVICE,
    });
  });

  it("throws an auth error when there is no password form", () => {
    expect(() => parseLoginForm("<html></html>", CAS)).toThrow(QwasarAuthError);
  });
});

describe("CookieJar", () => {
  it("keeps cookies per host", () => {
    const jar = new CookieJar();
    jar.absorb(`${CAS}/login`, new Headers({ "set-cookie": "a=1; Path=/" }));
    jar.absorb(`${APP}/x`, new Headers({ "set-cookie": "b=2; HttpOnly" }));
    expect(jar.header(`${CAS}/other`)).toBe("a=1");
    expect(jar.header(`${APP}/y`)).toBe("b=2");
    expect(jar.header("https://elsewhere.test/")).toBe("");
  });
});

describe("fetchQwasarCsv", () => {
  it("logs in through CAS and downloads the CSV", async () => {
    const { fetchImpl, calls } = fakeServer();
    const out = await fetchQwasarCsv({
      username: "admin",
      password: "pw",
      fetchImpl,
    });
    expect(out.csv).toBe(CSV);
    expect(out.contentType).toContain("text/csv");
    const post = calls.find((c) => c.method === "POST")!;
    const body = new URLSearchParams(post.body);
    expect(body.get("username")).toBe("admin");
    expect(body.get("password")).toBe("pw");
    expect(body.get("lt")).toBe("LT-123-abc");
    expect(body.get("authenticity_token")).toBe("tok&en");
    expect(calls.map((c) => c.url)).toContain(`${SERVICE}?ticket=ST-777`);
  });

  it("raises QwasarAuthError on rejected credentials and does not download", async () => {
    const { fetchImpl, calls } = fakeServer({ badPassword: true });
    await expect(
      fetchQwasarCsv({ username: "admin", password: "bad", fetchImpl })
    ).rejects.toBeInstanceOf(QwasarAuthError);
    expect(calls.some((c) => c.url.includes("download_progress"))).toBe(false);
  });

  it("raises QwasarImportError when the export is not CSV", async () => {
    const base = fakeServer();
    const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("download_progress")) {
        return new Response("<!DOCTYPE html><html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      }
      return base.fetchImpl(input, init);
    }) as typeof fetch;
    await expect(
      fetchQwasarCsv({ username: "admin", password: "pw", fetchImpl })
    ).rejects.toBeInstanceOf(QwasarImportError);
  });
});
