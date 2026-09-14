import Link from "next/link";

/**
 * Shared shell for the public legal pages (/policy, /terms).
 * Server components only — plain prose, no interactivity.
 */
export const LEGAL_ENTITY = {
  name: "Tech Education Foundation (StartSchool)",
  registrationNumber: "50008325331",
  vat: "LV50008325331",
  country: "Latvia",
  contactEmail: "start@startschool.org",
  platformUrl: "https://startup.startschool.org",
} as const;

export function LegalPage({
  title,
  effectiveDate,
  intro,
  children,
}: {
  title: string;
  effectiveDate: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white dark:bg-zinc-950">
      <article className="prose prose-zinc dark:prose-invert mx-auto max-w-3xl px-6 py-12">
        <header className="not-prose mb-8">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            StartSchool Platform
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Effective date: {effectiveDate}
          </p>
          <p className="mt-4 text-zinc-700 dark:text-zinc-300">{intro}</p>
        </header>

        {children}

        <footer className="not-prose mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <p>
            {LEGAL_ENTITY.name} · Reg. No. {LEGAL_ENTITY.registrationNumber} ·{" "}
            {LEGAL_ENTITY.country} ·{" "}
            <a
              className="underline underline-offset-4"
              href={`mailto:${LEGAL_ENTITY.contactEmail}`}
            >
              {LEGAL_ENTITY.contactEmail}
            </a>
          </p>
          <p className="mt-2 flex gap-4">
            <Link className="underline underline-offset-4" href="/policy">
              Privacy Policy
            </Link>
            <Link className="underline underline-offset-4" href="/terms">
              Terms of Use
            </Link>
            <Link className="underline underline-offset-4" href="/login">
              Sign in
            </Link>
          </p>
        </footer>
      </article>
    </main>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mt-10 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {children}
    </section>
  );
}
