// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseTasksFromExcel } from "@/lib/excel-utils";

// Mojibake form of "sign up → onboard": the arrow's UTF-8 bytes (e2 86 92)
// mis-decoded as Latin-1 codepoints. \u0086 and \u0092 are C1 control
// characters that never appear in legitimate text.
const MOJIBAKE_FLOW = "sign up \u00e2\u0086\u0092 onboard";

const csvFile = (content: string) =>
  new File([content], "tasks.csv", { type: "text/csv" });

describe("parseTasksFromExcel encoding guard", () => {
  it("rejects a CSV containing mojibake control characters", async () => {
    const csv = `title,description\nBuild Prototype,"${MOJIBAKE_FLOW}"\n`;

    await expect(parseTasksFromExcel(csvFile(csv))).rejects.toThrow(
      /encoding/i
    );
  });

  it("accepts a CSV with legitimate special characters", async () => {
    const csv = `title,description\nReach 5000 €,"landing → sign up — done"\n`;

    const tasks = await parseTasksFromExcel(csvFile(csv));

    expect(tasks).toHaveLength(1);
    expect(tasks[0].description).toBe("landing → sign up — done");
  });
});
