/**
 * Streamed loading state shown while the identity-callback server
 * component runs the in-app PDF render + Dokobit upload + signing-session
 * creation (5-15 seconds). Without this, users see a blank page during
 * the orchestration.
 */
export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div
          aria-hidden
          className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-700"
        />
        <h1 className="mb-2 text-xl font-semibold">Preparing your contract…</h1>
        <p className="text-sm text-zinc-600">
          We&apos;re verifying your identity and preparing the document for
          signing. Please don&apos;t close this page — it can take up to 15
          seconds.
        </p>
      </div>
    </main>
  );
}
