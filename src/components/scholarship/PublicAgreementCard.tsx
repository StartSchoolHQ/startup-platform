import { AgreementForm } from "./AgreementForm";
import { PrivacyNoticeSummary } from "./PrivacyNoticeSummary";

type AgreementType = "full" | "partial";

interface PublicAgreementCardProps {
  agreementType: AgreementType;
}

const HEADINGS: Record<AgreementType, string> = {
  full: "Full Scholarship Agreement",
  partial: "Partial Scholarship Agreement",
};

/**
 * Wraps the agreement form with a friendly heading, a plain-language
 * terms summary, the Art. 13 privacy disclosure (PrivacyNoticeSummary),
 * and the contact-data form. The legal binding text lives in the
 * contract itself (rendered to PDF after eID); this card is the
 * onboarding view the student sees before identifying themselves.
 */
export function PublicAgreementCard({
  agreementType,
}: PublicAgreementCardProps) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          {HEADINGS[agreementType]}
        </h1>
        <p className="mb-5 text-zinc-600 dark:text-zinc-400">
          Welcome to StartSchool. Below is a summary of your scholarship. After
          you fill in your contact details and confirm your identity, we&apos;ll
          prepare the full contract for you to sign electronically.
        </p>
        <PrivacyNoticeSummary />
        <div className="mt-6">
          <AgreementForm agreementType={agreementType} />
        </div>
      </div>
      <p className="text-center text-xs text-zinc-500">
        Questions? Email{" "}
        <a className="underline" href="mailto:start@startschool.org">
          start@startschool.org
        </a>
        .
      </p>
    </main>
  );
}
