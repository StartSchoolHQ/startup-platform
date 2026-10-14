import { looksLikeHtml } from "./csv";

/**
 * Qwasar admin export over a CAS login.
 *
 * Verified 2026-10-14: `GET /users/sign_in` on upskill redirects to
 * `casapp.us.qwasar.io/login?service=…`; the CAS page is a plain form
 * (`authenticity_token`, `lt`, `service`, `username`, `password`, POST /login,
 * cookie `_appcas_session`, no captcha, no 2FA). A good login answers 302 to
 * `service?ticket=ST-…`; following it on upskill sets the app session; then
 * `GET /admin/campuses/startschool/users/download_progress` is `text/csv`.
 *
 * The job only downloads; it never changes anything on Qwasar.
 */

export const QWASAR_BASE = "https://upskill.us.qwasar.io";
export const QWASAR_SIGNIN_PATH = "/users/sign_in";
export const QWASAR_EXPORT_PATH =
  "/admin/campuses/startschool/users/download_progress";

type FetchLike = typeof fetch;

/** Login rejected (bad credentials, form changed). Never retried. */
export class QwasarAuthError extends Error {
  readonly kind = "auth" as const;
}

/** Anything else: network, unexpected status, HTML instead of CSV. */
export class QwasarImportError extends Error {
  readonly kind = "import" as const;
}

export interface LoginForm {
  action: string;
  fields: Record<string, string>;
}

/** Hidden inputs + action of the CAS form. Throws when the form is missing. */
export function parseLoginForm(html: string, pageUrl: string): LoginForm {
  const form = html
    .match(/<form[^>]*>[\s\S]*?<\/form>/gi)
    ?.find((f) => /name="password"/i.test(f));
  if (!form) {
    throw new QwasarAuthError("Qwasar login form not found on the CAS page");
  }
  const action = form.match(/action="([^"]*)"/i)?.[1] ?? "";
  const fields: Record<string, string> = {};
  for (const input of form.match(/<input[^>]*>/gi) ?? []) {
    const name = input.match(/name="([^"]*)"/i)?.[1];
    const type = input.match(/type="([^"]*)"/i)?.[1] ?? "text";
    if (!name || type !== "hidden") continue;
    fields[name] = decodeHtml(input.match(/value="([^"]*)"/i)?.[1] ?? "");
  }
  return { action: new URL(action || pageUrl, pageUrl).toString(), fields };
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Per-host cookie jar; just enough for two Rails apps. */
export class CookieJar {
  private jars = new Map<string, Map<string, string>>();

  absorb(url: string, headers: Headers): void {
    const host = new URL(url).host;
    const raw: string[] =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : splitSetCookie(headers.get("set-cookie") ?? "");
    if (raw.length === 0) return;
    const jar = this.jars.get(host) ?? new Map<string, string>();
    for (const line of raw) {
      const pair = line.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq <= 0) continue;
      jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
    this.jars.set(host, jar);
  }

  header(url: string): string {
    const jar = this.jars.get(new URL(url).host);
    if (!jar || jar.size === 0) return "";
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
}

/** Fallback for runtimes without `getSetCookie`: split on commas that start a new cookie. */
function splitSetCookie(value: string): string[] {
  if (!value) return [];
  return value.split(/,(?=\s*[A-Za-z0-9_\-]+=)/).map((s) => s.trim());
}

export interface FetchCsvOptions {
  username: string;
  password: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
  /** Hard cap on redirects followed after the CAS ticket. */
  maxRedirects?: number;
}

export interface FetchCsvResult {
  csv: string;
  bytes: number;
  contentType: string;
}

async function request(
  fetchImpl: FetchLike,
  jar: CookieJar,
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  const cookie = jar.header(url);
  if (cookie) headers.set("cookie", cookie);
  headers.set("user-agent", "StartSchool-ProgramAssistant/1.0");
  const res = await fetchImpl(url, { ...init, headers, redirect: "manual" });
  jar.absorb(url, res.headers);
  return res;
}

function isRedirect(res: Response): boolean {
  return res.status >= 300 && res.status < 400 && !!res.headers.get("location");
}

/** Logs in through CAS and downloads the progress export. */
export async function fetchQwasarCsv(
  opts: FetchCsvOptions
): Promise<FetchCsvResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = (opts.baseUrl ?? QWASAR_BASE).replace(/\/+$/, "");
  const maxRedirects = opts.maxRedirects ?? 6;
  const jar = new CookieJar();

  // 1. upskill → CAS login page
  const signin = await request(fetchImpl, jar, `${base}${QWASAR_SIGNIN_PATH}`);
  if (!isRedirect(signin)) {
    throw new QwasarImportError(
      `sign_in did not redirect to CAS (status ${signin.status})`
    );
  }
  const casUrl = new URL(
    signin.headers.get("location")!,
    `${base}${QWASAR_SIGNIN_PATH}`
  ).toString();
  const casPage = await request(fetchImpl, jar, casUrl);
  if (casPage.status !== 200) {
    throw new QwasarImportError(`CAS login page answered ${casPage.status}`);
  }
  const form = parseLoginForm(await casPage.text(), casUrl);

  // 2. POST credentials
  const body = new URLSearchParams({
    ...form.fields,
    username: opts.username,
    password: opts.password,
  });
  const login = await request(fetchImpl, jar, form.action, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      referer: casUrl,
    },
    body: body.toString(),
  });
  if (!isRedirect(login)) {
    // CAS re-renders the form with 200 (or 401) on bad credentials.
    throw new QwasarAuthError(
      `Qwasar login rejected (status ${login.status}); check QWASAR_USERNAME / QWASAR_PASSWORD`
    );
  }

  // 3. follow the service ticket back to upskill (and any app redirects)
  let next: string | null = new URL(
    login.headers.get("location")!,
    form.action
  ).toString();
  for (let hop = 0; next && hop < maxRedirects; hop++) {
    const res: Response = await request(fetchImpl, jar, next);
    next = isRedirect(res)
      ? new URL(res.headers.get("location")!, next).toString()
      : null;
  }

  // 4. download
  const exportUrl = `${base}${QWASAR_EXPORT_PATH}`;
  const dl = await request(fetchImpl, jar, exportUrl);
  if (isRedirect(dl)) {
    throw new QwasarAuthError(
      "export redirected to login: the CAS session was not accepted by upskill"
    );
  }
  if (dl.status !== 200) {
    throw new QwasarImportError(`export answered ${dl.status}`);
  }
  const contentType = dl.headers.get("content-type") ?? "";
  const csv = await dl.text();
  if (!/text\/csv/i.test(contentType) || looksLikeHtml(csv)) {
    throw new QwasarImportError(
      `export is not CSV (content-type "${contentType}")`
    );
  }
  return { csv, bytes: Buffer.byteLength(csv, "utf8"), contentType };
}
