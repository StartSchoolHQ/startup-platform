/**
 * /agreement/identity-callback?session_token=...
 *
 * Dokobit redirects the student here after PIN1. We orchestrate identity
 * verification + PDF render + signing-session creation, then 302 the
 * student to the Dokobit hosted signing UI.
 *
 * The work takes 5-15 seconds (n8n PDF render + Dokobit upload). Next.js
 * streams `loading.tsx` while this server component is executing so the
 * user sees a spinner instead of a blank page.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CompleteIdentityError,
  completeIdentityAndCreateSigning,
} from "@/lib/scholarship/complete-identity";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_token?: string }>;
}

interface ErrorViewProps {
  title: string;
  body: string;
}

function ErrorView({ title, body }: ErrorViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="text-zinc-600">{body}</p>
        <p className="mt-4 text-sm text-zinc-500">
          Need help? Email{" "}
          <a className="underline" href="mailto:start@startschool.org">
            start@startschool.org
          </a>
          .
        </p>
      </div>
    </main>
  );
}

function isNextRedirectThrow(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export default async function IdentityCallbackPage({
  searchParams,
}: PageProps) {
  const { session_token } = await searchParams;

  if (!session_token) {
    redirect("/");
  }

  const headerList = await headers();
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const host = headerList.get("host");
  const origin = `${proto}://${host}`;

  try {
    const { signing_ui_url } = await completeIdentityAndCreateSigning({
      dokobit_session_token: session_token,
      origin,
    });
    redirect(signing_ui_url);
  } catch (err) {
    // Next.js uses thrown signals for redirect() — rethrow.
    if (isNextRedirectThrow(err)) throw err;

    if (err instanceof CompleteIdentityError) {
      if (err.code === "auth_not_complete") {
        return (
          <ErrorView
            title="Identity check not completed"
            body="Please go back to the previous page and try again."
          />
        );
      }
      if (err.code === "identity_mismatch") {
        return (
          <ErrorView
            title="This link belongs to another person"
            body="For security reasons, only the person whose identity was confirmed in the first attempt can sign this contract."
          />
        );
      }
    }

    return (
      <ErrorView
        title="Something went wrong"
        body="An error occurred while preparing your contract. Please contact StartSchool."
      />
    );
  }
}
