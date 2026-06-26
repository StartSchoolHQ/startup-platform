/**
 * In-app HTML → PDF rendering for scholarship contracts.
 *
 * Replaces the previous n8n PDF webhook. Runs inside a Vercel serverless
 * function using puppeteer-core + @sparticuz/chromium.
 *
 *   - On Vercel / AWS Lambda: chromium binary is loaded from
 *     @sparticuz/chromium at runtime (kept out of the deploy bundle via
 *     next.config.ts `serverExternalPackages`).
 *   - On local dev: requires PUPPETEER_LOCAL_CHROME_PATH pointing at an
 *     installed Chrome / Chromium binary.
 *
 * The Handlebars templates set `@page { size: A4; margin: 2cm; }` and load
 * Noto Sans / Noto Serif from Google Fonts for Latvian diacritic coverage.
 * After setContent we await `document.fonts.ready` so PIN-second renders
 * never catch the Noto font mid-fetch.
 */
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

function isServerless(): boolean {
  return !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_VERSION;
}

async function resolveExecutablePath(): Promise<string> {
  if (isServerless()) {
    return await chromium.executablePath();
  }
  const local = process.env.PUPPETEER_LOCAL_CHROME_PATH;
  if (!local) {
    throw new Error(
      "PDF renderer: PUPPETEER_LOCAL_CHROME_PATH is not set. " +
        "Point it at your local Chrome / Chromium executable for development."
    );
  }
  return local;
}

export interface RenderPdfOptions {
  /**
   * When set, renders a running footer on every page: this label on the
   * left, "page X of Y" on the right. Used by the part-time contract to
   * match its source document; full/partial pass nothing and render
   * footerless exactly as before.
   */
  footerLabel?: string;
}

export async function renderHtmlToPdf(
  html: string,
  options: RenderPdfOptions = {}
): Promise<Buffer> {
  const serverless = isServerless();
  const browser = await puppeteer.launch({
    args: serverless
      ? chromium.args
      : ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: await resolveExecutablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    // Stylesheet <link> tags fire "load" once the CSS is parsed, but the
    // @font-face declarations they pull in resolve asynchronously.
    // document.fonts.ready waits for the actual webfont fetch + parse,
    // which is what we need before rendering Latvian diacritics.
    await page.evaluate(() => document.fonts.ready);
    const footer = options.footerLabel
      ? {
          displayHeaderFooter: true,
          // Empty header suppresses Chromium's default date/title header.
          headerTemplate: "<div></div>",
          footerTemplate: `<div style="font-size:9px; font-style:italic; color:#555; font-family: Georgia, 'Times New Roman', serif; width:100%; margin:0 2cm; display:flex; justify-content:space-between;"><span>${options.footerLabel}</span><span>page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`,
        }
      : {};
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      ...footer,
    });
    if (pdf.length === 0) {
      throw new Error("PDF renderer returned empty buffer");
    }
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
