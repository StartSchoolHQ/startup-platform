/**
 * Renders a worst-case diploma through real headless Chrome and asserts
 * it always fits ONE A4 page. Needs a local Chrome binary — skipped
 * unless PUPPETEER_LOCAL_CHROME_PATH is set (CI without Chrome stays
 * green; run locally to verify layout changes).
 */
import { describe, expect, it } from "vitest";
import { countPdfPages, renderHtmlToPdf } from "@/lib/diplomas/pdf-render";
import { renderDiplomaHtml } from "@/lib/diplomas/pdf-template";
import { buildSnapshot } from "@/lib/diplomas/snapshot";
import type { BatchRow, RpcDiplomaData } from "@/lib/diplomas/types";

const LONG_DESC =
  "This track covers both front-end and back-end development, including " +
  "fundamental programming concepts, languages such as Ruby, JavaScript, " +
  "HTML, and CSS, as well as database management, object-oriented design, " +
  "and cloud deployment. It also prepares students for real-world job " +
  "interviews through extensive role plays and résumé reviews.";

const batch: BatchRow = {
  id: "b",
  name: "Mercury-Redstone",
  admission_date: "2025-09-01",
  completion_date: "2026-08-01",
  number_prefix: "B1",
  next_seq: 99,
};

function worstCaseRpc(trackCount: number): RpcDiplomaData {
  return {
    student: {
      name: "Aleksandrs Čūčis-Bērziņš Vanausisks",
      personal_code: "010101-11111",
      qwasar_username: "user_w",
    },
    startup_name: "SuperLongStartupName International",
    startup_modules: [
      { category: "idea-validation", hours: 229, percent: 100 },
      { category: "team-growth", hours: 71, percent: 100 },
      { category: "product-foundation", hours: 323, percent: 100 },
      { category: "customer-acquisition", hours: 397, percent: 100 },
      { category: "legal-finance", hours: 70, percent: 100 },
      { category: "pitch", hours: 36, percent: 100 },
    ],
    tech_modules: Array.from({ length: trackCount }, (_, i) => ({
      track: `Track ${i}`,
      display_name: `Season 0${(i % 4) + 1} Some Long Track Name ${i}`,
      weeks: 11,
      description: LONG_DESC,
      percent: 75 + (i % 25),
    })),
  };
}

describe.skipIf(!process.env.PUPPETEER_LOCAL_CHROME_PATH)(
  "diploma PDF one-pager guarantee",
  () => {
    it("worst case (10 verbose tracks + full startup module) fits one page", async () => {
      const snapshot = buildSnapshot({
        rpc: worstCaseRpc(10),
        batch,
        diplomaNumber: "B1-S099",
        diplomaType: "full",
        issuedDate: "2026-08-03",
      });
      const pdf = await renderHtmlToPdf(renderDiplomaHtml(snapshot));
      expect(countPdfPages(pdf)).toBe(1);
    }, 60000);

    it("typical case renders one page at full scale", async () => {
      const snapshot = buildSnapshot({
        rpc: worstCaseRpc(5),
        batch,
        diplomaNumber: "B1-S098",
        diplomaType: "full",
        issuedDate: "2026-08-03",
      });
      const pdf = await renderHtmlToPdf(renderDiplomaHtml(snapshot));
      expect(countPdfPages(pdf)).toBe(1);
    }, 60000);
  }
);
