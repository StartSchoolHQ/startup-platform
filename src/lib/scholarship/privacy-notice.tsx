/**
 * Single source of truth for the scholarship-agreement privacy notice.
 *
 * Both `PrivacyNoticeSummary` (collapsible card embedded in the form
 * page) and `PrivacyNoticeFull` (full standalone page) render from the
 * data below. Editing the notice = editing this file. There is no
 * second version anywhere.
 *
 * IMPORTANT (placeholders): controller legal name + registration number
 * + registered address are placeholders. Replace before going live in
 * production. The contact email is real (start@startschool.org).
 */

export interface NoticeRecipient {
  name: string;
  role: string;
  location: string;
  transfer_basis: string;
}

export interface NoticeRight {
  title: string;
  description: string;
}

export interface PrivacyNoticeContent {
  effective_date: string;
  controller: {
    name: string;
    registration_number: string;
    address: string;
    contact_email: string;
  };
  data_collected: string[];
  purposes: string[];
  legal_bases: string[];
  recipients: NoticeRecipient[];
  retention: string;
  rights: NoticeRight[];
  supervisory_authority: {
    name: string;
    url: string;
    country: string;
  };
  automated_decision_making: string;
}

// Replace `[PLACEHOLDER ...]` strings before going live.
export const SCHOLARSHIP_PRIVACY_NOTICE: PrivacyNoticeContent = {
  effective_date: "2026-05-25",
  controller: {
    name: "StartSchool [PLACEHOLDER — legal entity name]",
    registration_number: "[PLACEHOLDER — registration number]",
    address: "[PLACEHOLDER — registered address, Latvia]",
    contact_email: "start@startschool.org",
  },
  data_collected: [
    "Email address (provided twice on the form for typo confirmation)",
    "Phone number",
    "Postal address",
    "First name and surname (returned by Dokobit eID)",
    "National personal identification code (Latvian personas kods or equivalent EU eID identifier, returned by Dokobit eID)",
    "Country code of the eID provider",
    "Date and time of identity verification and signature",
    "The fully executed scholarship agreement PDF / .edoc",
    "IP address and basic browser metadata (in standard server logs for security and abuse prevention)",
  ],
  purposes: [
    "Verifying your identity before signing the scholarship agreement",
    "Forming and executing the scholarship agreement between you and StartSchool",
    "Sending you confirmation and the final signed agreement by email",
    "Maintaining the executed agreement as a business record",
    "Preventing fraud, including blocking the same person from receiving overlapping agreements",
  ],
  legal_bases: [
    "Art. 6(1)(b) GDPR — processing is necessary for the performance of a contract you are entering into",
    "Art. 6(1)(c) GDPR — compliance with legal obligations relating to the retention of contractual and accounting records",
    "Processing of the Latvian personal identification code is carried out pursuant to the Personal Identification Codes Law and only where strictly necessary to verify identity and form a binding contract",
  ],
  recipients: [
    {
      name: "Dokobit UAB",
      role: "Electronic identification (eID) and qualified electronic signature",
      location: "Lithuania (EEA)",
      transfer_basis: "Processor in the EEA — no third-country transfer",
    },
    {
      name: "Supabase",
      role: "Database hosting and private storage of the signed agreement",
      location: "European Union region",
      transfer_basis: "Processor in the EEA — no third-country transfer",
    },
    {
      name: "n8n Cloud",
      role: "Workflow orchestration: contract rendering to PDF and dispatch of the completion email",
      location: "n8n Cloud (workspace in EU region)",
      transfer_basis:
        "Processor under DPA with Standard Contractual Clauses where applicable",
    },
    {
      name: "Vercel",
      role: "Hosting of the public agreement web pages",
      location: "United States (with EU edge delivery)",
      transfer_basis:
        "Standard Contractual Clauses (SCCs) per Vercel Data Processing Addendum",
    },
    {
      name: "Sentry",
      role: "Error monitoring (no sensitive form fields are sent — see scrubbing policy)",
      location: "United States",
      transfer_basis:
        "Standard Contractual Clauses (SCCs) per Sentry Data Processing Addendum",
    },
    {
      name: "Email delivery provider (via n8n)",
      role: "Sending the completion email containing the signed agreement",
      location:
        "Depends on the SMTP/email provider configured by the controller",
      transfer_basis: "Standard Contractual Clauses where applicable",
    },
  ],
  retention:
    "Drafts that are never completed are automatically deleted 14 days after creation. Executed agreements (and the structured records associated with them) are retained for the duration of the contract plus 3 years, corresponding to the general civil-claim limitation period under Latvian law. Where Latvian tax or accounting law requires a longer retention period for any specific record, that longer period applies to that record only.",
  rights: [
    {
      title: "Access",
      description:
        "You may request a copy of the personal data we hold about you.",
    },
    {
      title: "Rectification",
      description:
        "You may request correction of inaccurate or incomplete data.",
    },
    {
      title: "Erasure",
      description:
        "You may request deletion of your data, subject to the legal retention obligations described above. We cannot delete a validly executed agreement during its retention period.",
    },
    {
      title: "Restriction",
      description:
        "You may request that we restrict processing in specific situations defined by Art. 18 GDPR.",
    },
    {
      title: "Data portability",
      description:
        "You may request a copy of the data you provided in a structured, machine-readable format.",
    },
    {
      title: "Object",
      description:
        "Where processing is based on legitimate interests you may object on grounds relating to your particular situation. Processing necessary to perform the agreement cannot be objected to without terminating the agreement.",
    },
    {
      title: "Withdraw consent",
      description:
        "Our processing of your data for this agreement is based on contract performance and legal obligation, not consent — so withdrawal of consent does not apply. If you no longer wish to proceed before signing, simply close this page.",
    },
  ],
  supervisory_authority: {
    name: "Datu valsts inspekcija (Data State Inspectorate)",
    url: "https://www.dvi.gov.lv",
    country: "Latvia",
  },
  automated_decision_making:
    "We do not make any decision affecting you that is based solely on automated processing, including profiling, under Art. 22 GDPR.",
};
