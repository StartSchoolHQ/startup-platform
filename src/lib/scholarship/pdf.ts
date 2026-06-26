/**
 * Contract rendering — Handlebars HTML out, in-app puppeteer PDF out.
 *
 * The two templates (`full-scholarship-en.hbs`, `partial-scholarship-en.hbs`)
 * live under `src/lib/scholarship/templates/` and are read from disk at
 * runtime. Compiled templates are cached at module scope.
 *
 * Production note: Next.js's serverless bundler must include the `.hbs`
 * files alongside the compiled API routes. That's wired up via
 * `outputFileTracingIncludes` in `next.config.ts`.
 *
 * Handlebars HTML-escapes interpolations by default; this guards against
 * stray script tags or injection via signer name / address. We do NOT use
 * triple-stash (`{{{ }}}`) anywhere — values from the form and from Dokobit
 * eID are not trusted markup.
 */
import { readFileSync } from "fs";
import { join } from "path";
import Handlebars from "handlebars";
import { renderHtmlToPdf } from "./pdf-render";

// The part-time contract bakes a literal "+" before the phone variable
// ("phone +{{Phonenumber}}"). Students often type the number with their own
// leading "+", which would render as "++371…". Strip a single leading "+"
// (and surrounding spaces) from the value so the literal "+" stands alone.
Handlebars.registerHelper("stripLeadingPlus", (value: unknown) =>
  typeof value === "string" ? value.replace(/^\s*\+\s*/, "") : value
);

export interface ContractSignerData {
  name: string;
  surname: string;
  personal_code: string;
  country_code: string;
}

import type { Database } from "@/types/database";

type AgreementType = Database["public"]["Enums"]["scholarship_agreement_type"];

export interface ContractRenderInput {
  agreement_type: AgreementType;
  signer: ContractSignerData;
  recipient_email: string;
  recipient_phone: string;
  recipient_address: string;
  /** Pre-formatted "DD.MM.YYYY". Only the part-time template renders it. */
  birthdate?: string;
  date_today: string;
  agreement_reference: string;
}

// Each supported agreement type maps to a template file. Unsupported values
// throw at runtime in renderContractHtml.
const TEMPLATE_FILES: Partial<Record<AgreementType, string>> = {
  full: "full-scholarship-en.hbs",
  partial: "partial-scholarship-en.hbs",
  part_time: "part-time-en.hbs",
};

const TEMPLATE_DIR = join(
  process.cwd(),
  "src",
  "lib",
  "scholarship",
  "templates"
);

const compiledTemplateCache = new Map<string, HandlebarsTemplateDelegate>();

function getCompiledTemplate(filename: string): HandlebarsTemplateDelegate {
  const cached = compiledTemplateCache.get(filename);
  if (cached) return cached;
  const source = readFileSync(join(TEMPLATE_DIR, filename), "utf8");
  const compiled = Handlebars.compile(source);
  compiledTemplateCache.set(filename, compiled);
  return compiled;
}

/**
 * Renders the contract to HTML. Pure: no I/O beyond reading the template
 * from disk. Used standalone for tests and as the first step of
 * `renderContractPdf`.
 */
export function renderContractHtml(input: ContractRenderInput): string {
  const filename = TEMPLATE_FILES[input.agreement_type];
  if (!filename) {
    throw new Error(
      `Unknown scholarship agreement_type: ${String(input.agreement_type)}`
    );
  }
  return getCompiledTemplate(filename)(input);
}

/**
 * Renders the contract HTML, then converts it to a PDF buffer in-process
 * via headless Chromium. Throws if the render returns an empty body.
 */
export async function renderContractPdf(
  input: ContractRenderInput
): Promise<Buffer> {
  const html = renderContractHtml(input);
  return renderHtmlToPdf(html);
}
