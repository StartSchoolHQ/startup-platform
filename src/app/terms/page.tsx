import type { Metadata } from "next";
import {
  LEGAL_ENTITY,
  LegalPage,
  LegalSection,
} from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use — StartSchool Platform",
  description: "The rules for using the StartSchool Platform.",
};

export const dynamic = "force-static";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      effectiveDate="2026-09-14"
      intro="These terms apply to the StartSchool Platform, operated by Tech Education Foundation. By signing in you agree to them."
    >
      <LegalSection id="who" title="1. Who can use the platform">
        <p>
          The platform is for participants, mentors and staff of StartSchool
          programmes. You sign in with the Google account issued to you for the
          programme. Accounts are personal and may not be shared.
        </p>
      </LegalSection>

      <LegalSection id="account" title="2. Your account">
        <p>
          Keep your Google account secure and tell us at once if you think
          someone else has used it. You are responsible for what happens under
          your account. We may suspend or archive an account that breaks these
          terms or when a programme batch ends.
        </p>
      </LegalSection>

      <LegalSection id="conduct" title="3. Acceptable use">
        <ul>
          <li>Treat other participants, mentors and staff with respect.</li>
          <li>
            Do not upload content that is unlawful, offensive or that you do not
            have the right to share.
          </li>
          <li>
            Do not try to break, overload, scrape or gain unauthorised access to
            the platform or other people&apos;s data.
          </li>
          <li>Do not misrepresent your work or manipulate rewards.</li>
        </ul>
      </LegalSection>

      <LegalSection id="content" title="4. Your content">
        <p>
          You keep ownership of what you submit. You give us permission to store
          it, show it to your team, mentors and staff, review it (including with
          automated tools) and use it to run the programme, for example to award
          progress and prepare diplomas. We do not use your content for
          advertising.
        </p>
      </LegalSection>

      <LegalSection id="rewards" title="5. Points, credits and achievements">
        <p>
          Experience points, credits, achievements and leaderboard positions are
          part of the programme&apos;s learning design. They have no monetary
          value, cannot be exchanged for money and may be corrected if awarded
          in error.
        </p>
      </LegalSection>

      <LegalSection id="availability" title="6. Availability and changes">
        <p>
          We aim to keep the platform running but provide it as is, without
          warranties. We may change, pause or discontinue features at any time,
          and we may update these terms. The effective date shows the current
          version.
        </p>
      </LegalSection>

      <LegalSection id="liability" title="7. Liability">
        <p>
          To the extent permitted by Latvian law, Tech Education Foundation is
          not liable for indirect losses or for loss of data or content caused
          by circumstances outside our reasonable control. Nothing in these
          terms limits rights you have under mandatory consumer law.
        </p>
      </LegalSection>

      <LegalSection id="privacy" title="8. Privacy">
        <p>
          How we handle personal data is described in the{" "}
          <a href="/policy">Privacy Policy</a>.
        </p>
      </LegalSection>

      <LegalSection id="law" title="9. Governing law and contact">
        <p>
          These terms are governed by the laws of the Republic of Latvia.
          Questions go to{" "}
          <a href={`mailto:${LEGAL_ENTITY.contactEmail}`}>
            {LEGAL_ENTITY.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
