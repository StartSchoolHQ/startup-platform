interface ThankYouCardProps {
  /** First name extracted from the signer record (Dokobit eID). */
  firstName?: string | null;
}

/**
 * Shown to the student after their PIN2 signature. Reassures them that
 * the school countersign is the next step and that they'll receive the
 * fully-signed `.edoc` by email.
 */
export function ThankYouCard({ firstName }: ThankYouCardProps) {
  const greeting = firstName ? `Thank you, ${firstName}!` : "Thank you!";
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {greeting}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Your signature has been received. StartSchool will countersign next,
          and you&apos;ll receive the fully signed contract by email.
        </p>
        <p className="mt-4 text-sm text-zinc-500">You can close this page.</p>
      </div>
    </main>
  );
}
