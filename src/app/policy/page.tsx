import type { Metadata } from "next";
import {
  LEGAL_ENTITY,
  LegalPage,
  LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — StartSchool Platform",
  description:
    "How the StartSchool Platform collects, uses and protects personal data.",
};

export const dynamic = "force-static";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      effectiveDate="2026-09-14"
      intro="This policy explains what personal data the StartSchool Platform collects, why, and what your rights are. It applies to everyone who signs in to the platform."
    >
      <LegalSection id="controller" title="1. Who we are">
        <p>
          The data controller is <strong>{LEGAL_ENTITY.name}</strong>,
          registration number {LEGAL_ENTITY.registrationNumber}, a foundation
          registered in {LEGAL_ENTITY.country}. Contact us at{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>
            {LEGAL_ENTITY.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection id="data" title="2. What we collect">
        <ul>
          <li>
            <strong>Google account data</strong> when you sign in with Google:
            your name, email address and profile picture URL. We use Google only
            to verify who you are. We do not read your Gmail, Drive, Calendar or
            any other Google data.
          </li>
          <li>
            <strong>Profile data</strong> you add on the platform: display name
            and the profile photo you upload.
          </li>
          <li>
            <strong>Programme content</strong> you submit: task submissions,
            weekly reports, peer reviews, meeting notes, team details and
            messages to support.
          </li>
          <li>
            <strong>Progress data</strong> the platform generates: completed
            tasks, experience points, credits, achievements, leaderboard
            positions and strikes.
          </li>
          <li>
            <strong>Technical data</strong>: IP address, browser and device
            type, pages visited and actions taken, collected through product
            analytics and error reporting.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="purposes" title="3. Why we process it">
        <ul>
          <li>To run the StartSchool programme you are enrolled in.</li>
          <li>To keep your account secure and prevent misuse.</li>
          <li>
            To review task submissions, including with automated (AI) tools
            whose results may be checked by our staff.
          </li>
          <li>To show progress, rankings and achievements to your cohort.</li>
          <li>To understand how the platform is used and to fix errors.</li>
        </ul>
        <p>
          The legal bases are performance of the programme agreement with you
          and our legitimate interest in running a secure, working platform.
        </p>
      </LegalSection>

      <LegalSection id="processors" title="4. Who we share it with">
        <p>
          We do not sell personal data. We use these service providers, who
          process data only on our instructions:
        </p>
        <ul>
          <li>Supabase — database, authentication and file storage.</li>
          <li>Vercel — hosting of the platform.</li>
          <li>Google — sign-in.</li>
          <li>PostHog — product analytics.</li>
          <li>Sentry — error reporting.</li>
          <li>
            OpenAI — automated review of the text of task submissions. Only the
            submission and the task instructions are sent, not your account
            details.
          </li>
        </ul>
        <p>
          Some providers process data outside the EU/EEA. Where that happens,
          transfers rely on the European Commission&apos;s standard contractual
          clauses or an equivalent safeguard.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="5. How long we keep it">
        <p>
          We keep your data while you take part in the programme and for as long
          as needed afterwards to issue diplomas, answer questions about your
          participation and meet legal obligations. When a programme batch is
          closed, accounts are archived. You can ask us to delete your account
          and data at any time.
        </p>
      </LegalSection>

      <LegalSection id="cookies" title="6. Cookies">
        <p>
          The platform sets cookies that keep you signed in and a small number
          of analytics cookies that help us understand usage. We do not use
          advertising cookies.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="7. Your rights">
        <p>
          You can ask to access, correct, delete or receive a copy of your data,
          and to restrict or object to how we process it. Email{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>
            {LEGAL_ENTITY.contactEmail}
          </a>
          . You also have the right to complain to the Latvian Data State
          Inspectorate (Datu valsts inspekcija).
        </p>
      </LegalSection>

      <LegalSection id="changes" title="8. Changes">
        <p>
          We may update this policy. The effective date at the top shows the
          current version. Material changes will be announced on the platform.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
