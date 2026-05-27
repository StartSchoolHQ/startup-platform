# Dokobit Client

Internal two-product API client for the Dokobit Identity Gateway and
Documents Gateway. Used exclusively by the scholarship-agreement module
(`src/lib/scholarship/**`).

## Modules

| File | Responsibility |
|---|---|
| `client.ts` | Base `dokobitFetch` wrapper + `DokobitError` class |
| `identity.ts` | Identity Gateway: `createAuthSession`, `getAuthStatus` |
| `signing.ts` | Documents Gateway: upload, signing create / add signer / batch / status / archive + URL helpers |
| `types.ts` | Zod response schemas (all `.passthrough()` for forward-compat) |
| `errors.ts` | Maps documented Dokobit error codes (6001/6005-6008/7023) to user-facing messages |

## Environment

```
DOKOBIT_IDENTITY_API_KEY=
DOKOBIT_IDENTITY_BASE_URL=https://id-sandbox.dokobit.com

DOKOBIT_DOCUMENTS_API_KEY=
DOKOBIT_DOCUMENTS_BASE_URL=https://gateway-sandbox.dokobit.com
DOKOBIT_DOCUMENTS_UI_BASE_URL=

DOKOBIT_POSTBACK_ALLOWLIST=
```

Sandbox accounts are free to register at https://sandbox.dokobit.com.
Production credentials require a paid Dokobit contract.

## Batch signing — limitations

`createBatch` lets a signer confirm up to **20** signings with **one** PIN
entry. Important constraints:

- **Smart-ID is NOT supported** for batch signing. This is a Smart-ID
  protocol restriction (one PIN = one signature), not a Dokobit one. Use
  the sequential `addSigner` + per-document UI flow when the signer only
  has Smart-ID.
- Supported batch methods: **eParaksts Mobile**, **SmartCard**, **USB
  token** (collectively passed as `stationary` in Dokobit's API).
- Max 20 signings per batch — split larger queues client-side.

## Errors

All non-2xx responses throw `DokobitError(message, status, body)`. Catch at
the API route boundary; never expose `body` to clients (it may contain
echoes of the request).

## Adding a new endpoint

1. Add the Zod response schema to `types.ts`.
2. Add the wrapper function in `identity.ts` or `signing.ts`.
3. Route the call through `dokobitFetch` — never call `fetch` directly.
4. Update this README and the seam-audit allowlist if a new symbol is
   exported.
