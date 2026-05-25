"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SCHOLARSHIP_PRIVACY_NOTICE } from "@/lib/scholarship/privacy-notice";

/**
 * Always-visible Art. 13 disclosure embedded above the scholarship form.
 *
 * The opening paragraph names the controller, what we collect, why, the
 * legal basis, and where to find the full notice — that's the GDPR
 * minimum at the point of collection. The expander reveals the
 * recipients, retention and rights without forcing the student onto a
 * second page just to see them.
 */
export function PrivacyNoticeSummary() {
  const [open, setOpen] = useState(false);
  const n = SCHOLARSHIP_PRIVACY_NOTICE;

  return (
    <section
      aria-labelledby="privacy-summary-heading"
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900/40"
    >
      <h2
        id="privacy-summary-heading"
        className="mb-1 font-semibold text-zinc-900 dark:text-zinc-50"
      >
        Privacy &amp; data
      </h2>
      <p className="text-zinc-700 dark:text-zinc-300">
        StartSchool processes the contact details you enter here, plus the
        identity data returned by Dokobit (name, surname, national personal
        code, country), in order to verify your identity and form the
        scholarship agreement (GDPR Art. 6(1)(b)). The processed data, the
        recipients, the retention period and your rights are described in the
        full{" "}
        <a
          href="/privacy/scholarship-agreement"
          className="font-medium underline underline-offset-4 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          Scholarship Privacy Notice
        </a>
        .
      </p>

      <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
        <CollapsibleTrigger className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100">
          <span>{open ? "Hide details" : "Show details"}</span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden="true"
          />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-3 space-y-3 text-zinc-700 dark:text-zinc-300">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Recipients
            </h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {n.recipients.map((r) => (
                <li key={r.name}>
                  <span className="font-medium">{r.name}</span> — {r.role} (
                  {r.location})
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Retention
            </h3>
            <p className="mt-1">{n.retention}</p>
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              Your rights
            </h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {n.rights.map((r) => (
                <li key={r.title}>
                  <span className="font-medium">{r.title}.</span>{" "}
                  {r.description}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              To exercise these rights, contact{" "}
              <a
                href={`mailto:${n.controller.contact_email}`}
                className="underline"
              >
                {n.controller.contact_email}
              </a>
              . You also have the right to lodge a complaint with{" "}
              <a
                href={n.supervisory_authority.url}
                rel="noreferrer noopener"
                target="_blank"
                className="underline"
              >
                {n.supervisory_authority.name}
              </a>{" "}
              ({n.supervisory_authority.country}).
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
