import { SCHOLARSHIP_PRIVACY_NOTICE } from "@/lib/scholarship/privacy-notice";

/**
 * Full Art. 13 privacy notice. Rendered standalone at
 * `/privacy/scholarship-agreement` and linked from the form summary.
 * Server component — no interactivity required.
 */
export function PrivacyNoticeFull() {
  const n = SCHOLARSHIP_PRIVACY_NOTICE;

  return (
    <article className="prose prose-zinc dark:prose-invert mx-auto max-w-3xl px-6 py-12">
      <header className="not-prose mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Scholarship Agreement Privacy Notice
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Effective date: {n.effective_date}
        </p>
      </header>

      <Section id="controller" title="1. Who is the data controller">
        <p>
          <strong>{n.controller.name}</strong>
          <br />
          Registration number: {n.controller.registration_number}
          <br />
          Registered address: {n.controller.address}
          <br />
          Contact:{" "}
          <a href={`mailto:${n.controller.contact_email}`}>
            {n.controller.contact_email}
          </a>
        </p>
        <p className="text-sm text-zinc-500">
          StartSchool has not appointed a Data Protection Officer (no statutory
          obligation under Art. 37 GDPR applies to our activities). All privacy
          enquiries should be sent to the address above.
        </p>
      </Section>

      <Section id="data" title="2. What personal data we process">
        <ul>
          {n.data_collected.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </Section>

      <Section id="purposes" title="3. Why we process it">
        <ul>
          {n.purposes.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </Section>

      <Section id="legal-basis" title="4. Legal basis">
        <ul>
          {n.legal_bases.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </Section>

      <Section id="recipients" title="5. Recipients and processors">
        <p>
          The recipients listed below are processors who act on our instructions
          under written data-processing agreements. We do not sell your data to
          anyone.
        </p>
        <div className="not-prose mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                <th className="py-2 pr-4 font-semibold">Recipient</th>
                <th className="py-2 pr-4 font-semibold">Role</th>
                <th className="py-2 pr-4 font-semibold">Location</th>
                <th className="py-2 pr-4 font-semibold">Transfer basis</th>
              </tr>
            </thead>
            <tbody>
              {n.recipients.map((r) => (
                <tr
                  key={r.name}
                  className="border-b border-zinc-100 align-top dark:border-zinc-900"
                >
                  <td className="py-2 pr-4 font-medium">{r.name}</td>
                  <td className="py-2 pr-4">{r.role}</td>
                  <td className="py-2 pr-4">{r.location}</td>
                  <td className="py-2 pr-4">{r.transfer_basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="retention" title="6. How long we keep your data">
        <p>{n.retention}</p>
      </Section>

      <Section id="rights" title="7. Your rights">
        <p>Under the GDPR you have the following rights:</p>
        <ul>
          {n.rights.map((r) => (
            <li key={r.title}>
              <strong>{r.title}.</strong> {r.description}
            </li>
          ))}
        </ul>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a href={`mailto:${n.controller.contact_email}`}>
            {n.controller.contact_email}
          </a>
          . We respond within one month (Art. 12(3) GDPR).
        </p>
      </Section>

      <Section
        id="supervisory-authority"
        title="8. Right to complain to a supervisory authority"
      >
        <p>
          You have the right to lodge a complaint with the{" "}
          <a
            href={n.supervisory_authority.url}
            rel="noreferrer noopener"
            target="_blank"
          >
            {n.supervisory_authority.name}
          </a>{" "}
          ({n.supervisory_authority.country}) if you believe your data has been
          processed unlawfully.
        </p>
      </Section>

      <Section id="automated-decisions" title="9. Automated decision-making">
        <p>{n.automated_decision_making}</p>
      </Section>

      <Section id="security" title="10. Security">
        <p>
          The signed agreement and all related records are stored in a private
          storage bucket hosted in the European Union. Access is restricted to
          authorised StartSchool staff and to the processors listed in section
          5, each of whom is bound by written confidentiality and security
          obligations. The web pages used for this flow are excluded from
          third-party product analytics and session-recording tools, and
          sensitive field values are scrubbed from our error-monitoring system
          before transmission.
        </p>
      </Section>
    </article>
  );
}

function Section({
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
      <div className="mt-2 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}
