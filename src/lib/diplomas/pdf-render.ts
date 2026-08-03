/**
 * In-app HTML → PDF rendering for diplomas.
 *
 * Intentionally duplicated from the scholarship module's renderer — that
 * module is firewalled by scripts/seam-audit.mjs, so cross-importing is
 * not allowed. Runs inside a Vercel serverless function using
 * puppeteer-core + @sparticuz/chromium (both already in
 * next.config.ts `serverExternalPackages`).
 *
 *   - On Vercel / AWS Lambda: chromium binary loads from @sparticuz/chromium.
 *   - On local dev: requires PUPPETEER_LOCAL_CHROME_PATH pointing at an
 *     installed Chrome / Chromium binary.
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

/**
 * Counts pages in a Chromium-generated PDF. Skia writes page objects
 * uncompressed, so counting `/Type /Page` markers (excluding `/Pages`
 * tree nodes) is reliable for our own renderer output.
 */
export function countPdfPages(pdf: Buffer): number {
  const matches = pdf.toString("latin1").match(/\/Type\s*\/Page(?![a-zA-Z])/g);
  return matches ? matches.length : 0;
}

/**
 * Renders HTML to a SINGLE A4 page, always. If the content overflows,
 * re-prints at progressively smaller scale (Chromium reflows text at
 * print scale, like the browser print dialog's "Scale" control) until
 * it fits. Floor of 0.5 — below that something is structurally wrong.
 */
export async function renderHtmlToPdf(html: string): Promise<Buffer> {
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
    // document.fonts.ready waits for webfont fetch + parse so Latvian
    // diacritics never render with a fallback font.
    await page.evaluate(() => document.fonts.ready);

    let pdf = Buffer.from(
      await page.pdf({ printBackground: true, preferCSSPageSize: true })
    );
    for (
      let scale = 0.9;
      countPdfPages(pdf) > 1 && scale >= 0.5;
      scale -= 0.1
    ) {
      pdf = Buffer.from(
        await page.pdf({ printBackground: true, format: "a4", scale })
      );
    }

    if (pdf.length === 0) {
      throw new Error("PDF renderer returned empty buffer");
    }
    if (countPdfPages(pdf) > 1) {
      throw new Error(
        "Diploma did not fit one A4 page even at 50% scale — check content"
      );
    }
    return pdf;
  } finally {
    await browser.close();
  }
}
