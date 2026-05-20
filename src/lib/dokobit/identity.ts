/**
 * Dokobit Identity Gateway wrapper.
 *
 * Two operations:
 * - `createAuthSession` — opens an eID authentication session and returns
 *   the URL we redirect the student to (Smart-ID, eParaksts Mobile, ID card,
 *   etc. — Dokobit's hosted UI lets the user pick).
 * - `getAuthStatus` — polled or called on the return callback to retrieve
 *   the authenticated person's name, surname, personal code and country.
 *
 * Never call `fetch` against Dokobit URLs from outside this module.
 */
import { dokobitFetch } from "./client";
import {
  DokobitAuthStatusResponse,
  DokobitCreateAuthSessionResponse,
} from "./types";

export type DokobitAuthMethod =
  | "mobile"
  | "smartid"
  | "smartcard"
  | "eparaksts_mobile"
  | "audkenni_app";

interface CreateAuthSessionInput {
  returnUrl: string;
  message?: string;
  countryCode?: string;
  authenticationMethods?: DokobitAuthMethod[];
}

export async function createAuthSession(input: CreateAuthSessionInput) {
  const body: Record<string, unknown> = { return_url: input.returnUrl };
  if (input.message) body.message = input.message;
  if (input.countryCode) body.country_code = input.countryCode;
  if (input.authenticationMethods?.length) {
    body.authentication_methods = input.authenticationMethods;
  }

  const raw = await dokobitFetch<unknown>({
    product: "identity",
    method: "POST",
    path: "/api/authentication/create",
    body,
  });
  return DokobitCreateAuthSessionResponse.parse(raw);
}

export async function getAuthStatus(sessionToken: string) {
  const raw = await dokobitFetch<unknown>({
    product: "identity",
    method: "GET",
    path: `/api/authentication/${sessionToken}/status`,
  });
  return DokobitAuthStatusResponse.parse(raw);
}
