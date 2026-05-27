import { cn } from "@/lib/utils";

type AgreementType = "full" | "partial";

interface ScholarshipTermsSummaryProps {
  agreementType: AgreementType;
  className?: string;
}

interface TermsContent {
  title: string;
  bullets: string[];
  /** Optional: rendered as a small note below the bullets. */
  footnote?: string;
}

const TERMS: Record<AgreementType, TermsContent> = {
  full: {
    title: "Full Scholarship",
    bullets: [
      "StartSchool covers 100% of the €5000 tuition fee",
      "You pay €0 in tuition",
      "Study period: 26 Aug 2025 – 29 Aug 2026",
      "Performance checkpoints: end of October 2025, December 2025, March 2026",
    ],
    footnote:
      "Enrolment fee: €500, due within 14 days of signing (non-refundable)",
  },
  partial: {
    title: "Partial Scholarship",
    bullets: [
      "StartSchool covers 60% of the €5000 tuition fee",
      "You pay €2000 tuition in two €1000 instalments (within 14 days of signing, and 31 January 2026)",
      "Study period: 26 Aug 2025 – 29 Aug 2026",
      "Performance checkpoints: end of October 2025, December 2025, March 2026",
    ],
    footnote:
      "Enrolment fee: €500, due within 14 days of signing (non-refundable)",
  },
};

/**
 * Plain-language summary of what the student is signing up for. The full
 * legal text is the contract itself — this is intentionally short.
 * Variants driven by `agreementType`; share the same layout.
 */
export function ScholarshipTermsSummary({
  agreementType,
  className,
}: ScholarshipTermsSummaryProps) {
  const terms = TERMS[agreementType];
  return (
    <div
      className={cn("rounded-md bg-zinc-50 p-4 dark:bg-zinc-900", className)}
    >
      <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {terms.title}
      </h2>
      <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-700 dark:text-zinc-300">
        {terms.bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      {terms.footnote && (
        <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
          {terms.footnote}
        </p>
      )}
    </div>
  );
}
