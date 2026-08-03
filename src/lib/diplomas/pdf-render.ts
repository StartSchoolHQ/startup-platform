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
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
    });
    if (pdf.length === 0) {
      throw new Error("PDF renderer returned empty buffer");
    }
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
