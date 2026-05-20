/**
 * Base fetch wrapper for the Dokobit Identity and Documents Gateway APIs.
 *
 * Two products, two sets of credentials — `configFor` picks the right base
 * URL and API key based on `product`. The API key is always passed as the
 * `access_token` query parameter (Dokobit's convention) — NOT a header.
 *
 * Non-2xx responses throw `DokobitError`. Catch at the route boundary and
 * never expose `body` to clients; it can contain sensitive request echoes.
 */

type Product = "identity" | "documents";

interface FetchOpts {
  product: Product;
  method: "GET" | "POST";
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

export class DokobitError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown
  ) {
    super(message);
    this.name = "DokobitError";
  }
}

function configFor(product: Product): { base: string; key: string } {
  const base =
    product === "identity"
      ? process.env.DOKOBIT_IDENTITY_BASE_URL
      : process.env.DOKOBIT_DOCUMENTS_BASE_URL;
  const key =
    product === "identity"
      ? process.env.DOKOBIT_IDENTITY_API_KEY
      : process.env.DOKOBIT_DOCUMENTS_API_KEY;
  if (!base || !key) {
    throw new Error(
      `Dokobit ${product} client is not configured: set ` +
        `DOKOBIT_${product.toUpperCase()}_BASE_URL and ` +
        `DOKOBIT_${product.toUpperCase()}_API_KEY`
    );
  }
  return { base, key };
}

export async function dokobitFetch<T>(opts: FetchOpts): Promise<T> {
  const { base, key } = configFor(opts.product);
  const url = new URL(opts.path, base);
  url.searchParams.set("access_token", key);
  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      url.searchParams.set(k, v);
    }
  }

  const init: RequestInit = { method: opts.method };
  if (opts.body) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(opts.body);
  }

  const res = await fetch(url.toString(), init);
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    throw new DokobitError(
      `Dokobit ${opts.product} ${opts.method} ${opts.path} failed: ${res.status}`,
      res.status,
      parsed
    );
  }

  return parsed as T;
}
