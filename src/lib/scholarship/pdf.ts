/**
 * Contract rendering — Handlebars HTML out, n8n-produced PDF out.
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
import { renderPdf as n8nRenderPdf } from "./n8n";

export interface ContractSignerData {
  name: string;
  surname: string;
  personal_code: string;
  country_code: string;
}

export interface ContractRenderInput {
  agreement_type: "full" | "partial";
  signer: ContractSignerData;
  recipient_email: string;
  recipient_phone: string;
  recipient_address: string;
  date_today: string;
  agreement_reference: string;
}

const TEMPLATE_FILES: Record<ContractRenderInput["agreement_type"], string> = {
  full: "full-scholarship-en.hbs",
  partial: "partial-scholarship-en.hbs",
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
 * Renders the contract HTML, then asks n8n to convert it to a PDF buffer.
 * Throws if n8n is unreachable or returns an empty body.
 */
export async function renderContractPdf(
  input: ContractRenderInput
): Promise<Buffer> {
  const html = renderContractHtml(input);
  return n8nRenderPdf({
    template_id: input.agreement_type,
    language: "en",
    html,
  });
}
