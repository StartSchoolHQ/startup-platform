/**
 * /agreement/identity-callback?session_token=...
 *
 * Dokobit redirects the student here after PIN1. We orchestrate identity
 * verification + PDF render + signing-session creation, then 302 the
 * student to the Dokobit hosted signing UI.
 *
 * The work takes 5-15 seconds (in-app PDF render + Dokobit upload). Next.js
 * streams `loading.tsx` while this server component is executing so the
 * user sees a spinner instead of a blank page.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CompleteIdentityError,
  OrchestrationError,
  completeIdentityAndCreateSigning,
} from "@/lib/scholarship/complete-identity";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ session_token?: string }>;
}

interface ErrorViewProps {
  title: string;
  body: string;
  /** Support reference + machine code, shown so the user can email it. */
  reference?: string;
  code?: string;
}

function ErrorView({ title, body, reference, code }: ErrorViewProps) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="text-zinc-600">{body}</p>
        {reference && (
          <p className="mt-3 rounded bg-zinc-100 p-2 font-mono text-xs text-zinc-700">
            Reference: {reference}
            {code ? ` · ${code}` : ""}
          </p>
        )}
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

    // OrchestrationError has already been logged + recorded to the audit
    // trail inside completeIdentityAndCreateSigning. Only log here for
    // genuinely unexpected throws (e.g. row lookup before orchestration).
    if (
      !(err instanceof CompleteIdentityError) &&
      !(err instanceof OrchestrationError)
    ) {
      console.error("[identity-callback] orchestration failed:", err);
    }

    if (err instanceof CompleteIdentityError) {
      if (err.code === "auth_not_complete") {
        return (
          <ErrorView
            title="Identity check not completed"
            body="Please go back to the previous page and try again."
          />
        );
      }
      if (err.code === "already_signed") {
        return (
          <ErrorView
            title="You've already signed this agreement"
            body="Check your inbox (including spam) for the signed contract. If you can't find it, contact StartSchool."
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
      if (err.code === "auth_error") {
        return <ErrorView title="Identity check failed" body={err.message} />;
      }
    }

    if (err instanceof OrchestrationError) {
      return (
        <ErrorView
          title="Something went wrong"
          body={`We couldn't finish preparing your contract. ${err.detail.message} Please email the reference below to StartSchool and we'll sort it out.`}
          reference={err.reference}
          code={err.detail.code}
        />
      );
    }

    return (
      <ErrorView
        title="Something went wrong"
        body="An error occurred while preparing your contract. Please contact StartSchool."
      />
    );
  }
}
